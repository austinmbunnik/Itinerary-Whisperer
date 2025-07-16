import { 
  BrowserInfo, 
  RecordingCapabilities, 
  CodecSupport,
  getMobileConstraints,
  detectBrowserInfo,
  getRecordingCapabilities
} from './browserCompatibility';
import { 
  MemoryManager, 
  MemoryStatus, 
  ChunkMetadata, 
  RecordingMetrics 
} from './memoryManager';

export interface ChunkedRecordingConfig {
  stream: MediaStream;
  options: MediaRecorderOptions;
  constraints: MediaTrackConstraints;
  browserInfo: BrowserInfo;
  capabilities: RecordingCapabilities;
  chunkingEnabled: boolean;
  adaptiveChunking: boolean;
}

export interface RecordingCallbacks {
  onChunkReady?: (chunk: Blob, metadata: ChunkMetadata) => void;
  onMemoryWarning?: (status: MemoryStatus, metrics: RecordingMetrics) => void;
  onDurationWarning?: (duration: number, recommendation: string) => void;
  onSizeWarning?: (size: number, recommendation: string) => void;
  onRecordingComplete?: (chunks: Blob[], totalMetadata: RecordingMetrics) => void;
  onError?: (error: Error) => void;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
  chunkCount: number;
  memoryStatus: MemoryStatus | null;
  hasWarnings: boolean;
}

export class ChunkedAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private chunkMetadata: ChunkMetadata[] = [];
  private currentChunkData: Blob[] = [];
  private recordingConfig: ChunkedRecordingConfig | null = null;
  private memoryManager: MemoryManager;
  
  // State tracking
  private isRecording = false;
  private isPaused = false;
  private recordingStartTime = 0;
  private currentChunkStartTime = 0;
  private totalSize = 0;
  private chunkNumber = 0;
  
  // Timers and intervals
  private memoryMonitorCleanup: (() => void) | null = null;
  private chunkingInterval: number | null = null;
  private metricsInterval: number | null = null;
  
  // Configuration
  private readonly DEFAULT_CHUNK_DURATION = 60000; // 1 minute
  private readonly MIN_CHUNK_DURATION = 10000; // 10 seconds
  private readonly METRICS_UPDATE_INTERVAL = 1000; // 1 second

  constructor(private callbacks: RecordingCallbacks = {}) {
    this.memoryManager = MemoryManager.getInstance();
  }

  async initialize(enableChunking = true, adaptiveChunking = true): Promise<ChunkedRecordingConfig> {
    const browserInfo = detectBrowserInfo();
    const capabilities = await getRecordingCapabilities();
    
    if (!capabilities.hasGetUserMedia || !capabilities.hasMediaRecorder || !capabilities.preferredCodec) {
      throw new Error('Recording not supported in this browser');
    }
    
    const constraints = getMobileConstraints(browserInfo);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    const options = this.getOptimalRecordingOptions(capabilities.preferredCodec, browserInfo);
    
    this.recordingConfig = {
      stream,
      options,
      constraints,
      browserInfo,
      capabilities,
      chunkingEnabled: enableChunking,
      adaptiveChunking
    };
    
    return this.recordingConfig;
  }

  private getOptimalRecordingOptions(codec: CodecSupport, browserInfo: BrowserInfo): MediaRecorderOptions {
    const baseOptions: MediaRecorderOptions = {
      mimeType: codec.mimeType
    };
    
    // Set bitrate based on codec and platform
    if (codec.codec === 'opus') {
      baseOptions.audioBitsPerSecond = browserInfo.isMobile ? 64000 : 96000; // Lower for memory efficiency
    } else if (codec.codec === 'aac') {
      baseOptions.audioBitsPerSecond = browserInfo.isMobile ? 96000 : 128000;
    } else {
      baseOptions.audioBitsPerSecond = 96000; // Default conservative bitrate
    }
    
    return baseOptions;
  }

  async startRecording(): Promise<void> {
    if (!this.recordingConfig) {
      throw new Error('Recorder not initialized');
    }
    
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }
    
    try {
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.recordingConfig.stream, this.recordingConfig.options);
      
      // Reset state
      this.chunks = [];
      this.chunkMetadata = [];
      this.currentChunkData = [];
      this.totalSize = 0;
      this.chunkNumber = 0;
      this.recordingStartTime = Date.now();
      this.currentChunkStartTime = this.recordingStartTime;
      this.isRecording = true;
      this.isPaused = false;
      
      // Set up event handlers
      this.setupMediaRecorderHandlers();
      
      // Start memory monitoring
      this.startMemoryMonitoring();
      
      // Start metrics monitoring
      this.startMetricsMonitoring();
      
      // Start chunking if enabled
      if (this.recordingConfig.chunkingEnabled) {
        this.startChunkingInterval();
      }
      
      // Start recording with appropriate timeslice for smooth chunking
      const timeslice = this.recordingConfig.browserInfo.isMobile ? 1000 : 250;
      this.mediaRecorder.start(timeslice);
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private setupMediaRecorderHandlers(): void {
    if (!this.mediaRecorder) return;
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.currentChunkData.push(event.data);
        this.totalSize += event.data.size;
        
        // Check if we should create a chunk based on memory pressure
        if (this.recordingConfig?.adaptiveChunking) {
          this.checkAdaptiveChunking();
        }
      }
    };
    
    this.mediaRecorder.onstop = () => {
      // Process final chunk
      if (this.currentChunkData.length > 0) {
        this.createChunk();
      }
      
      // Notify completion
      if (this.callbacks.onRecordingComplete) {
        const metrics = this.getRecordingMetrics();
        this.callbacks.onRecordingComplete(this.chunks, metrics);
      }
      
      this.cleanup();
    };
    
    this.mediaRecorder.onerror = (event) => {
      const error = new Error(`MediaRecorder error: ${event}`);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      this.cleanup();
    };
  }

  private startMemoryMonitoring(): void {
    this.memoryManager.startMemoryMonitoring((status) => {
      if (this.callbacks.onMemoryWarning) {
        const metrics = this.getRecordingMetrics();
        this.callbacks.onMemoryWarning(status, metrics);
      }
      
      // Force chunking if memory is critical
      if (status.isCritical && this.currentChunkData.length > 0) {
        this.createChunk();
      }
    });
    
    // Store cleanup function
    this.memoryMonitorCleanup = () => this.memoryManager.stopMemoryMonitoring();
  }

  private startMetricsMonitoring(): void {
    this.metricsInterval = window.setInterval(async () => {
      const metrics = this.getRecordingMetrics();
      const memoryStatus = await this.memoryManager.getMemoryStatus();
      const limits = this.memoryManager.getRecordingLimits(memoryStatus);
      
      // Check duration warnings
      if (metrics.totalDuration >= limits.warningDuration) {
        if (metrics.totalDuration >= limits.maxDuration) {
          // Auto-stop at max duration
          this.stopRecording();
        } else if (this.callbacks.onDurationWarning) {
          const remaining = this.memoryManager.formatDuration(limits.maxDuration - metrics.totalDuration);
          this.callbacks.onDurationWarning(
            metrics.totalDuration,
            `Recording duration is approaching the limit. ${remaining} remaining.`
          );
        }
      }
      
      // Check size warnings
      if (metrics.totalSize >= limits.warningSize) {
        if (metrics.totalSize >= limits.maxSize) {
          // Auto-stop at max size
          this.stopRecording();
        } else if (this.callbacks.onSizeWarning) {
          const remaining = this.memoryManager.formatMemorySize(limits.maxSize - metrics.totalSize);
          this.callbacks.onSizeWarning(
            metrics.totalSize,
            `Recording size is approaching the limit. ${remaining} remaining.`
          );
        }
      }
    }, this.METRICS_UPDATE_INTERVAL);
  }

  private startChunkingInterval(): void {
    const getChunkInterval = async () => {
      const memoryStatus = await this.memoryManager.getMemoryStatus();
      
      // Adaptive chunk duration based on memory
      if (memoryStatus.isCritical) {
        return this.MIN_CHUNK_DURATION;
      } else if (memoryStatus.isLow) {
        return this.DEFAULT_CHUNK_DURATION / 2;
      }
      
      return this.DEFAULT_CHUNK_DURATION;
    };
    
    const scheduleNextChunk = async () => {
      const interval = await getChunkInterval();
      this.chunkingInterval = window.setTimeout(() => {
        if (this.isRecording && !this.isPaused && this.currentChunkData.length > 0) {
          this.createChunk();
          scheduleNextChunk();
        }
      }, interval);
    };
    
    scheduleNextChunk();
  }

  private async checkAdaptiveChunking(): Promise<void> {
    const currentChunkSize = this.currentChunkData.reduce((sum, blob) => sum + blob.size, 0);
    const currentDuration = Date.now() - this.currentChunkStartTime;
    const memoryStatus = await this.memoryManager.getMemoryStatus();
    
    if (this.memoryManager.shouldTriggerChunking(currentChunkSize, currentDuration, memoryStatus)) {
      this.createChunk();
    }
  }

  private createChunk(): void {
    if (this.currentChunkData.length === 0) return;
    
    // Create blob from current chunk data
    const mimeType = this.mediaRecorder?.mimeType || this.recordingConfig?.options.mimeType || 'audio/webm';
    const chunkBlob = new Blob(this.currentChunkData, { type: mimeType });
    
    // Create metadata
    const metadata: ChunkMetadata = {
      id: `chunk-${this.chunkNumber}-${Date.now()}`,
      timestamp: Date.now(),
      duration: Date.now() - this.currentChunkStartTime,
      size: chunkBlob.size,
      startTime: this.currentChunkStartTime,
      endTime: Date.now()
    };
    
    // Store chunk and metadata
    this.chunks.push(chunkBlob);
    this.chunkMetadata.push(metadata);
    
    // Notify callback
    if (this.callbacks.onChunkReady) {
      this.callbacks.onChunkReady(chunkBlob, metadata);
    }
    
    // Reset for next chunk
    this.currentChunkData = [];
    this.currentChunkStartTime = Date.now();
    this.chunkNumber++;
    
    // Clean up old chunks if memory is low
    this.performMemoryCleanup();
  }

  private async performMemoryCleanup(): Promise<void> {
    const memoryStatus = await this.memoryManager.getMemoryStatus();
    
    if (memoryStatus.isLow && this.chunks.length > 2) {
      // Keep only the most recent chunks in memory
      const chunksToKeep = memoryStatus.isCritical ? 1 : 2;
      const chunksToRemove = this.chunks.length - chunksToKeep;
      
      if (chunksToRemove > 0) {
        const removedChunks = this.chunks.splice(0, chunksToRemove);
        await this.memoryManager.cleanupAudioChunks(removedChunks);
      }
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }
    
    // Stop intervals
    if (this.chunkingInterval) {
      clearTimeout(this.chunkingInterval);
      this.chunkingInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Stop recording
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.isRecording = false;
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      
      // Create a chunk when pausing to avoid large accumulated data
      if (this.currentChunkData.length > 0) {
        this.createChunk();
      }
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPaused = false;
      this.currentChunkStartTime = Date.now();
    }
  }

  getRecordingState(): RecordingState {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      size: this.totalSize,
      chunkCount: this.chunks.length,
      memoryStatus: null, // Will be updated asynchronously
      hasWarnings: false
    };
  }

  getRecordingMetrics(): RecordingMetrics {
    const currentDuration = this.isRecording ? Date.now() - this.recordingStartTime : 0;
    const averageChunkSize = this.chunks.length > 0 
      ? this.totalSize / this.chunks.length 
      : 0;
    
    // const estimatedBitrate = currentDuration > 0 
    //   ? (this.totalSize * 8) / (currentDuration / 1000) 
    //   : this.recordingConfig?.options.audioBitsPerSecond || 96000;
    
    const estimatedFinalSize = currentDuration > 0
      ? (this.totalSize / currentDuration) * (60 * 60 * 1000) // Estimate for 1 hour
      : 0;
    
    return {
      totalDuration: currentDuration,
      totalSize: this.totalSize,
      chunkCount: this.chunks.length,
      averageChunkSize,
      estimatedFinalSize,
      memoryUsage: {
        used: 0,
        total: 0,
        available: 0,
        percentage: 0,
        isLow: false,
        isCritical: false
      }
    };
  }

  async getRecordingStateWithMemory(): Promise<RecordingState> {
    const state = this.getRecordingState();
    state.memoryStatus = await this.memoryManager.getMemoryStatus();
    
    const metrics = this.getRecordingMetrics();
    const limits = this.memoryManager.getRecordingLimits(state.memoryStatus);
    
    state.hasWarnings = 
      metrics.totalDuration >= limits.warningDuration ||
      metrics.totalSize >= limits.warningSize ||
      state.memoryStatus.isLow;
    
    return state;
  }

  private cleanup(): void {
    // Stop all intervals
    if (this.chunkingInterval) {
      clearTimeout(this.chunkingInterval);
      this.chunkingInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Stop memory monitoring
    if (this.memoryMonitorCleanup) {
      this.memoryMonitorCleanup();
      this.memoryMonitorCleanup = null;
    }
    
    // Clean up media recorder
    this.mediaRecorder = null;
    this.isRecording = false;
    this.isPaused = false;
    
    // Stop and clean up stream
    if (this.recordingConfig?.stream) {
      this.recordingConfig.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up audio chunks
    this.memoryManager.cleanupAudioChunks(this.chunks);
    this.memoryManager.cleanupAudioChunks(this.currentChunkData);
  }

  // Utility method to combine chunks for final output
  async combineChunks(): Promise<Blob> {
    if (this.chunks.length === 0) {
      throw new Error('No chunks to combine');
    }
    
    const mimeType = this.mediaRecorder?.mimeType || this.recordingConfig?.options.mimeType || 'audio/webm';
    return new Blob(this.chunks, { type: mimeType });
  }
}