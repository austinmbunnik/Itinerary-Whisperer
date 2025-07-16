export interface MemoryStatus {
  used: number;
  total: number;
  available: number;
  percentage: number;
  isLow: boolean;
  isCritical: boolean;
}

export interface ChunkMetadata {
  id: string;
  timestamp: number;
  duration: number;
  size: number;
  startTime: number;
  endTime: number;
}

export interface RecordingMetrics {
  totalDuration: number;
  totalSize: number;
  chunkCount: number;
  averageChunkSize: number;
  estimatedFinalSize: number;
  memoryUsage: MemoryStatus;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private performanceObserver: PerformanceObserver | null = null;
  private memoryCheckInterval: number | null = null;
  
  // Memory thresholds
  private readonly LOW_MEMORY_THRESHOLD = 0.7; // 70% memory usage
  private readonly CRITICAL_MEMORY_THRESHOLD = 0.85; // 85% memory usage
  private readonly MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
  private readonly MEMORY_CHECK_INTERVAL = 5000; // Check every 5 seconds
  
  // Recording limits
  private readonly WARNING_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_DURATION = 60 * 60 * 1000; // 60 minutes
  private readonly WARNING_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MAX_SIZE = 500 * 1024 * 1024; // 500MB

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  async getMemoryStatus(): Promise<MemoryStatus> {
    // Try to use the experimental memory API if available
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.jsHeapSizeLimit;
      const available = total - used;
      const percentage = used / total;
      
      return {
        used,
        total,
        available,
        percentage,
        isLow: percentage >= this.LOW_MEMORY_THRESHOLD,
        isCritical: percentage >= this.CRITICAL_MEMORY_THRESHOLD
      };
    }
    
    // Fallback: estimate based on typical browser limits
    // Most browsers allocate 1-4GB for JS heap
    const estimatedTotal = 1024 * 1024 * 1024; // 1GB estimate
    const estimatedUsed = await this.estimateMemoryUsage();
    const available = estimatedTotal - estimatedUsed;
    const percentage = estimatedUsed / estimatedTotal;
    
    return {
      used: estimatedUsed,
      total: estimatedTotal,
      available,
      percentage,
      isLow: percentage >= this.LOW_MEMORY_THRESHOLD,
      isCritical: percentage >= this.CRITICAL_MEMORY_THRESHOLD
    };
  }

  private async estimateMemoryUsage(): Promise<number> {
    // Estimate memory usage based on various factors
    let totalSize = 0;
    
    // Check for stored audio blobs in memory
    if (typeof window !== 'undefined' && window.performance) {
      const entries = performance.getEntriesByType('measure');
      entries.forEach(entry => {
        if (entry.name.includes('audio-chunk')) {
          totalSize += entry.duration * 1024; // Rough estimate
        }
      });
    }
    
    // Add a base memory usage estimate
    totalSize += 50 * 1024 * 1024; // 50MB base
    
    return totalSize;
  }

  startMemoryMonitoring(onMemoryWarning: (status: MemoryStatus) => void): void {
    if (this.memoryCheckInterval) {
      this.stopMemoryMonitoring();
    }
    
    this.memoryCheckInterval = window.setInterval(async () => {
      const status = await this.getMemoryStatus();
      
      if (status.isLow || status.isCritical) {
        onMemoryWarning(status);
      }
    }, this.MEMORY_CHECK_INTERVAL);
    
    // Set up performance observer if available
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.includes('memory-pressure')) {
              console.warn('Memory pressure detected:', entry);
            }
          });
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }

  calculateChunkSize(currentMemoryStatus: MemoryStatus, recordingDuration: number): number {
    let chunkSize = this.MAX_CHUNK_SIZE;
    
    // Reduce chunk size if memory is low
    if (currentMemoryStatus.isLow) {
      chunkSize = Math.floor(chunkSize * 0.5); // 50% reduction
    } else if (currentMemoryStatus.percentage > 0.5) {
      chunkSize = Math.floor(chunkSize * 0.75); // 25% reduction
    }
    
    // Further reduce for very long recordings
    if (recordingDuration > this.WARNING_DURATION) {
      chunkSize = Math.floor(chunkSize * 0.5);
    }
    
    return Math.max(chunkSize, 1024 * 1024); // Minimum 1MB chunks
  }

  shouldTriggerChunking(
    currentChunkSize: number, 
    recordingDuration: number,
    memoryStatus: MemoryStatus
  ): boolean {
    // Trigger chunking based on multiple factors
    if (currentChunkSize >= this.MAX_CHUNK_SIZE) return true;
    if (memoryStatus.isLow && currentChunkSize >= this.MAX_CHUNK_SIZE * 0.5) return true;
    if (memoryStatus.isCritical && currentChunkSize >= this.MAX_CHUNK_SIZE * 0.25) return true;
    
    // Time-based chunking for long recordings
    const chunkInterval = memoryStatus.isLow ? 30000 : 60000; // 30s or 60s chunks
    if (recordingDuration % chunkInterval < 1000) return true;
    
    return false;
  }

  getRecordingLimits(memoryStatus: MemoryStatus): {
    maxDuration: number;
    maxSize: number;
    warningDuration: number;
    warningSize: number;
  } {
    // Adjust limits based on memory status
    const memoryMultiplier = memoryStatus.isCritical ? 0.25 : 
                           memoryStatus.isLow ? 0.5 : 1;
    
    return {
      maxDuration: this.MAX_DURATION * memoryMultiplier,
      maxSize: this.MAX_SIZE * memoryMultiplier,
      warningDuration: this.WARNING_DURATION * memoryMultiplier,
      warningSize: this.WARNING_SIZE * memoryMultiplier
    };
  }

  estimateRemainingCapacity(
    currentSize: number,
    averageBitrate: number,
    memoryStatus: MemoryStatus
  ): { remainingDuration: number; remainingSize: number } {
    const limits = this.getRecordingLimits(memoryStatus);
    const remainingSize = limits.maxSize - currentSize;
    const remainingDuration = (remainingSize / averageBitrate) * 1000;
    
    return {
      remainingDuration: Math.min(remainingDuration, limits.maxDuration),
      remainingSize
    };
  }

  // Cleanup utilities
  async cleanupAudioChunks(chunks: Blob[]): Promise<void> {
    // Release blob references
    chunks.forEach(chunk => {
      if (chunk && typeof URL.revokeObjectURL === 'function') {
        try {
          // If the chunk was converted to an object URL, revoke it
          URL.revokeObjectURL(URL.createObjectURL(chunk));
        } catch (error) {
          // Ignore errors if blob wasn't converted to URL
        }
      }
    });
    
    // Clear the array
    chunks.length = 0;
    
    // Suggest garbage collection (not guaranteed)
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
  }

  formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}