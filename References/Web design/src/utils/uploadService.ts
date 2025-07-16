export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // milliseconds
  startTime: number;
  currentTime: number;
}

export interface UploadConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
  chunkSize?: number;
  enableChunking?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onComplete?: (response: any) => void;
  onError?: (error: UploadError) => void;
  metadata?: Record<string, any>;
}

export interface UploadError {
  type: 'network' | 'timeout' | 'server' | 'validation' | 'cancelled';
  message: string;
  statusCode?: number;
  details?: any;
  retryable: boolean;
}

export interface ChunkUploadState {
  chunkIndex: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  chunkProgress: Map<number, number>;
  sessionId: string;
}

export class UploadService {
  private activeUploads: Map<string, AbortController> = new Map();
  private chunkStates: Map<string, ChunkUploadState> = new Map();
  private progressTrackers: Map<string, UploadProgress> = new Map();

  async uploadAudioBlob(
    blob: Blob,
    config: UploadConfig,
    uploadId?: string
  ): Promise<any> {
    const id = uploadId || this.generateUploadId();
    const controller = new AbortController();
    this.activeUploads.set(id, controller);

    try {
      // Determine if chunking is needed
      const shouldChunk = config.enableChunking && blob.size > (config.chunkSize || 5 * 1024 * 1024);
      
      if (shouldChunk) {
        return await this.uploadInChunks(blob, config, id, controller);
      } else {
        return await this.uploadSingle(blob, config, id, controller);
      }
    } catch (error) {
      throw this.handleUploadError(error);
    } finally {
      this.cleanup(id);
    }
  }

  private async uploadSingle(
    blob: Blob,
    config: UploadConfig,
    uploadId: string,
    controller: AbortController
  ): Promise<any> {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    
    // Add metadata if provided
    if (config.metadata) {
      Object.entries(config.metadata).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
    }

    const startTime = Date.now();
    const progress: UploadProgress = {
      loaded: 0,
      total: blob.size,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      startTime,
      currentTime: startTime
    };
    this.progressTrackers.set(uploadId, progress);

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Progress handler
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          const speed = elapsedTime > 0 ? (event.loaded / elapsedTime) * 1000 : 0;
          const remainingBytes = event.total - event.loaded;
          const remainingTime = speed > 0 ? (remainingBytes / speed) * 1000 : 0;

          const updatedProgress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
            speed,
            remainingTime,
            startTime,
            currentTime
          };
          
          this.progressTrackers.set(uploadId, updatedProgress);
          config.onProgress?.(updatedProgress);
        }
      });

      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            config.onComplete?.(response);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject({
            type: 'server',
            message: `Upload failed with status ${xhr.status}`,
            statusCode: xhr.status,
            details: xhr.responseText,
            retryable: xhr.status >= 500
          });
        }
      });

      // Error handlers
      xhr.addEventListener('error', () => {
        reject({
          type: 'network',
          message: 'Network error occurred during upload',
          retryable: true
        });
      });

      xhr.addEventListener('abort', () => {
        reject({
          type: 'cancelled',
          message: 'Upload was cancelled',
          retryable: false
        });
      });

      xhr.addEventListener('timeout', () => {
        reject({
          type: 'timeout',
          message: 'Upload timed out',
          retryable: true
        });
      });

      // Configure request
      xhr.open('POST', config.endpoint);
      
      // Set headers
      if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      // Set timeout if specified
      if (config.timeout) {
        xhr.timeout = config.timeout;
      }

      // Handle abort controller
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      // Send request
      xhr.send(formData);
    });
  }

  private async uploadInChunks(
    blob: Blob,
    config: UploadConfig,
    uploadId: string,
    controller: AbortController
  ): Promise<any> {
    const chunkSize = config.chunkSize || 5 * 1024 * 1024; // 5MB default
    const totalChunks = Math.ceil(blob.size / chunkSize);
    const sessionId = this.generateSessionId();
    
    // Initialize chunk state
    const chunkState: ChunkUploadState = {
      chunkIndex: 0,
      totalChunks,
      uploadedChunks: new Set(),
      chunkProgress: new Map(),
      sessionId
    };
    this.chunkStates.set(uploadId, chunkState);

    const results = [];
    let retries = 0;
    const maxRetries = config.maxRetries || 3;

    for (let i = 0; i < totalChunks; i++) {
      if (controller.signal.aborted) {
        throw {
          type: 'cancelled',
          message: 'Upload was cancelled',
          retryable: false
        };
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, blob.size);
      const chunk = blob.slice(start, end);
      
      let chunkUploaded = false;
      let lastError: any;

      while (!chunkUploaded && retries <= maxRetries) {
        try {
          const result = await this.uploadChunk(
            chunk,
            i,
            totalChunks,
            sessionId,
            config,
            uploadId,
            controller
          );
          
          chunkState.uploadedChunks.add(i);
          config.onChunkComplete?.(i + 1, totalChunks);
          results.push(result);
          chunkUploaded = true;
          retries = 0; // Reset retries for next chunk
        } catch (error: any) {
          lastError = error;
          if (error.retryable && retries < maxRetries) {
            retries++;
            await this.delay(Math.pow(2, retries) * 1000); // Exponential backoff
          } else {
            throw error;
          }
        }
      }

      if (!chunkUploaded) {
        throw lastError || new Error('Failed to upload chunk after retries');
      }
    }

    // Finalize upload
    return await this.finalizeChunkedUpload(sessionId, totalChunks, config, controller);
  }

  private async uploadChunk(
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    sessionId: string,
    config: UploadConfig,
    uploadId: string,
    controller: AbortController
  ): Promise<any> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('sessionId', sessionId);
    
    if (config.metadata) {
      formData.append('metadata', JSON.stringify(config.metadata));
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const chunkStartTime = Date.now();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const chunkProgress = (event.loaded / event.total) * 100;
          const chunkState = this.chunkStates.get(uploadId);
          if (chunkState) {
            chunkState.chunkProgress.set(chunkIndex, chunkProgress);
            
            // Calculate overall progress
            const completedChunks = chunkState.uploadedChunks.size;
            const currentChunkProgress = chunkProgress / 100;
            const overallProgress = ((completedChunks + currentChunkProgress) / totalChunks) * 100;
            
            const currentTime = Date.now();
            const elapsedTime = currentTime - chunkStartTime;
            const speed = elapsedTime > 0 ? (event.loaded / elapsedTime) * 1000 : 0;
            
            const progress: UploadProgress = {
              loaded: completedChunks * (chunk.size) + event.loaded,
              total: totalChunks * chunk.size,
              percentage: Math.round(overallProgress),
              speed,
              remainingTime: this.estimateRemainingTime(chunkState, speed, chunk.size),
              startTime: chunkStartTime,
              currentTime
            };
            
            config.onProgress?.(progress);
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid chunk response format'));
          }
        } else {
          reject({
            type: 'server',
            message: `Chunk upload failed with status ${xhr.status}`,
            statusCode: xhr.status,
            details: xhr.responseText,
            retryable: xhr.status >= 500
          });
        }
      });

      xhr.addEventListener('error', () => {
        reject({
          type: 'network',
          message: 'Network error during chunk upload',
          retryable: true
        });
      });

      xhr.addEventListener('abort', () => {
        reject({
          type: 'cancelled',
          message: 'Chunk upload was cancelled',
          retryable: false
        });
      });

      xhr.open('POST', `${config.endpoint}/chunk`);
      
      if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.send(formData);
    });
  }

  private async finalizeChunkedUpload(
    sessionId: string,
    totalChunks: number,
    config: UploadConfig,
    controller: AbortController
  ): Promise<any> {
    const response = await fetch(`${config.endpoint}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify({
        sessionId,
        totalChunks,
        metadata: config.metadata
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw {
        type: 'server',
        message: `Finalization failed with status ${response.status}`,
        statusCode: response.status,
        details: await response.text(),
        retryable: response.status >= 500
      };
    }

    const result = await response.json();
    config.onComplete?.(result);
    return result;
  }

  cancelUpload(uploadId: string): void {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.cleanup(uploadId);
    }
  }

  getUploadProgress(uploadId: string): UploadProgress | null {
    return this.progressTrackers.get(uploadId) || null;
  }

  private handleUploadError(error: any): UploadError {
    if (error.type) {
      return error as UploadError;
    }
    
    if (error.name === 'AbortError') {
      return {
        type: 'cancelled',
        message: 'Upload was cancelled',
        retryable: false
      };
    }
    
    return {
      type: 'network',
      message: error.message || 'Unknown upload error',
      retryable: true,
      details: error
    };
  }

  private cleanup(uploadId: string): void {
    this.activeUploads.delete(uploadId);
    this.chunkStates.delete(uploadId);
    this.progressTrackers.delete(uploadId);
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private estimateRemainingTime(
    chunkState: ChunkUploadState,
    currentSpeed: number,
    chunkSize: number
  ): number {
    if (currentSpeed === 0) return 0;
    
    const remainingChunks = chunkState.totalChunks - chunkState.uploadedChunks.size - 1;
    const remainingBytes = remainingChunks * chunkSize;
    
    return (remainingBytes / currentSpeed) * 1000;
  }
}

export const uploadService = new UploadService();