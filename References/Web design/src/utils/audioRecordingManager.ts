import { 
  BrowserInfo, 
  RecordingCapabilities, 
  CodecSupport,
  getMobileConstraints,
  detectBrowserInfo,
  getRecordingCapabilities
} from './browserCompatibility';

export interface RecordingOptions {
  mimeType: string;
  audioBitsPerSecond?: number;
  bitsPerSecond?: number;
}

export interface RecordingConfig {
  stream: MediaStream;
  options: RecordingOptions;
  constraints: MediaTrackConstraints;
  browserInfo: BrowserInfo;
  capabilities: RecordingCapabilities;
}

export class AudioRecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingConfig: RecordingConfig | null = null;
  private isRecording = false;
  private recordingStartTime: number = 0;
  private maxDuration: number = 3600000; // 60 minutes in milliseconds

  constructor(private onDataAvailable?: (audioBlob: Blob, metadata: RecordingMetadata) => void) {}

  async initialize(): Promise<RecordingConfig> {
    const browserInfo = detectBrowserInfo();
    const capabilities = await getRecordingCapabilities();
    
    if (!capabilities.hasGetUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }
    
    if (!capabilities.hasMediaRecorder) {
      throw new Error('MediaRecorder is not supported in this browser');
    }
    
    if (!capabilities.preferredCodec) {
      throw new Error('No supported audio codecs found');
    }
    
    // Get appropriate constraints based on browser/device
    const constraints = getMobileConstraints(browserInfo);
    
    // Request microphone access with constraints
    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    
    // Prepare recording options with codec fallback
    const options = this.getOptimalRecordingOptions(capabilities.preferredCodec, browserInfo);
    
    this.recordingConfig = {
      stream,
      options,
      constraints,
      browserInfo,
      capabilities
    };
    
    return this.recordingConfig;
  }

  private getOptimalRecordingOptions(codec: CodecSupport, browserInfo: BrowserInfo): RecordingOptions {
    const baseOptions: RecordingOptions = {
      mimeType: codec.mimeType
    };
    
    // Adjust bitrate based on codec and platform
    if (codec.codec === 'opus') {
      baseOptions.audioBitsPerSecond = browserInfo.isMobile ? 96000 : 128000;
    } else if (codec.codec === 'aac') {
      baseOptions.audioBitsPerSecond = browserInfo.isMobile ? 128000 : 192000;
    } else if (codec.codec === 'vorbis') {
      baseOptions.audioBitsPerSecond = 128000;
    }
    
    // iOS Safari specific adjustments
    if (browserInfo.isIOS) {
      // iOS may have issues with certain bitrates
      baseOptions.bitsPerSecond = 128000;
      delete baseOptions.audioBitsPerSecond;
    }
    
    return baseOptions;
  }

  async startRecording(): Promise<void> {
    if (!this.recordingConfig) {
      throw new Error('Recording not initialized. Call initialize() first.');
    }
    
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }
    
    const { stream, options, browserInfo } = this.recordingConfig;
    
    try {
      // Create MediaRecorder with fallback options
      this.mediaRecorder = await this.createMediaRecorderWithFallback(stream, options);
      
      // Reset state
      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.isRecording = true;
      
      // Set up event handlers
      this.setupMediaRecorderHandlers();
      
      // Handle iOS-specific requirements
      if (browserInfo.isIOS) {
        // iOS requires a small delay before starting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Start recording with appropriate timeslice
      const timeslice = browserInfo.isMobile ? 1000 : 500; // 1s for mobile, 500ms for desktop
      this.mediaRecorder.start(timeslice);
      
      // Set up max duration timeout
      this.setupMaxDurationTimeout();
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private async createMediaRecorderWithFallback(
    stream: MediaStream, 
    preferredOptions: RecordingOptions
  ): Promise<MediaRecorder> {
    const { capabilities } = this.recordingConfig!;
    
    // Try preferred options first
    try {
      return new MediaRecorder(stream, preferredOptions);
    } catch (error) {
      console.warn('Failed to create MediaRecorder with preferred options:', error);
    }
    
    // Try fallback codecs
    for (const codec of capabilities.supportedCodecs) {
      if (codec.mimeType === preferredOptions.mimeType) continue;
      
      try {
        const fallbackOptions = this.getOptimalRecordingOptions(codec, this.recordingConfig!.browserInfo);
        console.info(`Falling back to codec: ${codec.mimeType}`);
        return new MediaRecorder(stream, fallbackOptions);
      } catch (error) {
        console.warn(`Failed to create MediaRecorder with ${codec.mimeType}:`, error);
      }
    }
    
    // Last resort: try without options
    console.warn('Creating MediaRecorder without specific options');
    return new MediaRecorder(stream);
  }

  private setupMediaRecorderHandlers(): void {
    if (!this.mediaRecorder) return;
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      this.processRecording();
    };
    
    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      this.handleRecordingError(event);
    };
  }

  private setupMaxDurationTimeout(): void {
    setTimeout(() => {
      if (this.isRecording) {
        console.warn('Maximum recording duration reached');
        this.stopRecording();
      }
    }, this.maxDuration);
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }
    
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop all tracks
    if (this.recordingConfig?.stream) {
      this.recordingConfig.stream.getTracks().forEach(track => track.stop());
    }
    
    this.isRecording = false;
  }

  private processRecording(): void {
    if (this.audioChunks.length === 0) {
      console.warn('No audio data recorded');
      return;
    }
    
    const mimeType = this.mediaRecorder?.mimeType || this.recordingConfig?.options.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    
    const metadata: RecordingMetadata = {
      duration: Date.now() - this.recordingStartTime,
      mimeType,
      size: audioBlob.size,
      codec: this.recordingConfig?.capabilities.preferredCodec?.codec || 'unknown',
      browserInfo: this.recordingConfig?.browserInfo || detectBrowserInfo(),
      timestamp: new Date().toISOString()
    };
    
    if (this.onDataAvailable) {
      this.onDataAvailable(audioBlob, metadata);
    }
    
    this.cleanup();
  }

  private handleRecordingError(event: Event): void {
    const error = (event as any).error;
    console.error('Recording error:', error);
    
    // Attempt to save partial recording if possible
    if (this.audioChunks.length > 0) {
      this.processRecording();
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    this.audioChunks = [];
    this.mediaRecorder = null;
    this.isRecording = false;
    
    if (this.recordingConfig?.stream) {
      this.recordingConfig.stream.getTracks().forEach(track => track.stop());
    }
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  getRecordingState(): RecordingState {
    return {
      isRecording: this.isRecording,
      isPaused: this.mediaRecorder?.state === 'paused',
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      browserInfo: this.recordingConfig?.browserInfo,
      codec: this.recordingConfig?.capabilities.preferredCodec || undefined
    };
  }

  // Progressive enhancement: Check for specific features
  static checkFeatureSupport(): FeatureSupport {
    return {
      basicRecording: !!(window.MediaRecorder && navigator.mediaDevices?.getUserMedia),
      pause: typeof MediaRecorder.prototype.pause === 'function',
      resume: typeof MediaRecorder.prototype.resume === 'function',
      audioBitsPerSecond: true, // Most browsers support this
      mimeTypeSelection: true,
      streamCapture: 'captureStream' in HTMLMediaElement.prototype
    };
  }
}

export interface RecordingMetadata {
  duration: number;
  mimeType: string;
  size: number;
  codec: string;
  browserInfo: BrowserInfo;
  timestamp: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  browserInfo?: BrowserInfo;
  codec?: CodecSupport;
}

export interface FeatureSupport {
  basicRecording: boolean;
  pause: boolean;
  resume: boolean;
  audioBitsPerSecond: boolean;
  mimeTypeSelection: boolean;
  streamCapture: boolean;
}