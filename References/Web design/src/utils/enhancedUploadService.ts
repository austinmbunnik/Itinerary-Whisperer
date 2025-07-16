export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  remainingTime: number;
  startTime: number;
  currentTime: number;
}

export interface DetailedUploadError {
  type: 'network_timeout' | 'network_offline' | 'network_connection' | 
        'client_invalid_request' | 'client_unauthorized' | 'client_forbidden' | 'client_not_found' | 'client_payload_too_large' |
        'server_internal' | 'server_unavailable' | 'server_gateway_timeout' |
        'validation_file_corrupted' | 'validation_unsupported_format' | 'validation_too_large' | 'validation_too_long' |
        'session_expired' | 'chunk_missing' | 'cancelled' | 'unknown';
  category: 'network' | 'client' | 'server' | 'validation' | 'session' | 'user_action' | 'unknown';
  message: string;
  statusCode?: number;
  details?: any;
  retryable: boolean;
  autoRetryable: boolean; // Can be automatically retried
  manualRetryable: boolean; // Requires manual user intervention
  suggestedAction?: string;
  userFriendlyMessage: string;
  technicalDetails?: string;
  recoveryOptions: RecoveryOption[];
}

export interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  action: 'retry' | 'retry_with_smaller_chunks' | 'retry_without_chunks' | 'check_connection' | 'refresh_page' | 'contact_support' | 'try_different_file';
  primary?: boolean;
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
  onError?: (error: DetailedUploadError) => void;
  onRecoveryOptionsAvailable?: (options: RecoveryOption[]) => void;
  metadata?: Record<string, any>;
}

export interface ChunkUploadState {
  chunkIndex: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  failedChunks: Set<number>;
  chunkProgress: Map<number, number>;
  sessionId: string;
  lastActivity: number;
}

export interface UploadSession {
  id: string;
  sessionId: string;
  blob: Blob;
  config: UploadConfig;
  state: ChunkUploadState;
  retryCount: number;
  lastError?: DetailedUploadError;
  createdAt: number;
}

export class EnhancedUploadService {
  private activeUploads: Map<string, AbortController> = new Map();
  private uploadSessions: Map<string, UploadSession> = new Map();
  private progressTrackers: Map<string, UploadProgress> = new Map();
  private cleanupTimers: Map<string, number> = new Map();

  async uploadAudioBlob(
    blob: Blob,
    config: UploadConfig,
    uploadId?: string
  ): Promise<any> {
    const id = uploadId || this.generateUploadId();
    const controller = new AbortController();
    this.activeUploads.set(id, controller);

    try {
      // Create upload session
      const session = this.createUploadSession(id, blob, config);
      this.uploadSessions.set(id, session);

      // Validate before upload
      await this.validateUploadPreconditions(blob, config);

      const shouldChunk = config.enableChunking && blob.size > (config.chunkSize || 5 * 1024 * 1024);
      
      if (shouldChunk) {
        return await this.uploadInChunks(session, controller);
      } else {
        return await this.uploadSingle(session, controller);
      }
    } catch (error) {
      const detailedError = this.categorizeError(error, blob, config);
      config.onError?.(detailedError);
      config.onRecoveryOptionsAvailable?.(detailedError.recoveryOptions);
      throw detailedError;
    } finally {
      this.scheduleCleanup(id);
    }
  }

  private createUploadSession(id: string, blob: Blob, config: UploadConfig): UploadSession {
    const sessionId = this.generateSessionId();
    return {
      id,
      sessionId,
      blob,
      config,
      state: {
        chunkIndex: 0,
        totalChunks: Math.ceil(blob.size / (config.chunkSize || 5 * 1024 * 1024)),
        uploadedChunks: new Set(),
        failedChunks: new Set(),
        chunkProgress: new Map(),
        sessionId,
        lastActivity: Date.now()
      },
      retryCount: 0,
      createdAt: Date.now()
    };
  }

  private async validateUploadPreconditions(blob: Blob, config: UploadConfig): Promise<void> {
    // Check network connectivity
    if (!navigator.onLine) {
      throw this.createDetailedError('network_offline', 'No network connection available');
    }

    // Validate file
    if (!blob || blob.size === 0) {
      throw this.createDetailedError('validation_file_corrupted', 'Audio file is empty or corrupted');
    }

    // Check file size limits
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (blob.size > maxSize) {
      throw this.createDetailedError('validation_too_large', `File size (${this.formatFileSize(blob.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`);
    }

    // Test endpoint connectivity
    try {
      const testResponse = await fetch(config.endpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!testResponse.ok && testResponse.status !== 405) { // 405 Method Not Allowed is acceptable for HEAD
        throw this.createDetailedError(
          this.categorizeHttpStatus(testResponse.status),
          `Server returned status ${testResponse.status}`
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw this.createDetailedError('network_timeout', 'Connection to server timed out');
      }
      throw this.createDetailedError('network_connection', 'Unable to reach upload server');
    }
  }

  private async uploadSingle(session: UploadSession, controller: AbortController): Promise<any> {
    const { blob, config } = session;
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    
    if (config.metadata) {
      Object.entries(config.metadata).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
    }

    return this.executeUploadRequest(session, formData, config.endpoint, controller);
  }

  private async uploadInChunks(session: UploadSession, controller: AbortController): Promise<any> {
    const { blob, config, state } = session;
    const chunkSize = config.chunkSize || 5 * 1024 * 1024;
    
    let lastError: DetailedUploadError | null = null;

    for (let i = 0; i < state.totalChunks; i++) {
      if (controller.signal.aborted) {
        throw this.createDetailedError('cancelled', 'Upload was cancelled by user');
      }

      // Skip already uploaded chunks
      if (state.uploadedChunks.has(i)) {
        continue;
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, blob.size);
      const chunk = blob.slice(start, end);
      
      let retryCount = 0;
      const maxChunkRetries = Math.min(config.maxRetries || 3, 5);

      while (retryCount <= maxChunkRetries) {
        try {
          await this.uploadChunk(chunk, i, session, controller);
          state.uploadedChunks.add(i);
          state.failedChunks.delete(i);
          config.onChunkComplete?.(i + 1, state.totalChunks);
          lastError = null;
          break;
        } catch (error: any) {
          lastError = this.categorizeError(error, blob, config);
          
          if (!lastError.autoRetryable || retryCount >= maxChunkRetries) {
            state.failedChunks.add(i);
            
            if (lastError.category === 'server' || lastError.retryable) {
              // For server errors, continue with other chunks but track the failure
              console.warn(`Chunk ${i} failed, continuing with remaining chunks:`, lastError);
              break;
            } else {
              // For critical errors, abort entire upload
              throw lastError;
            }
          }

          retryCount++;
          await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }
    }

    // Check if we have any failed chunks
    if (state.failedChunks.size > 0) {
      throw this.createDetailedError(
        'chunk_missing',
        `${state.failedChunks.size} chunks failed to upload. Last error: ${lastError?.message || 'Unknown error'}`
      );
    }

    // Finalize upload
    return await this.finalizeChunkedUpload(session, controller);
  }

  private async executeUploadRequest(
    session: UploadSession,
    formData: FormData,
    endpoint: string,
    controller: AbortController
  ): Promise<any> {
    const startTime = Date.now();
    const progress: UploadProgress = {
      loaded: 0,
      total: session.blob.size,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      startTime,
      currentTime: startTime
    };
    this.progressTrackers.set(session.id, progress);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
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
          
          this.progressTrackers.set(session.id, updatedProgress);
          session.config.onProgress?.(updatedProgress);
          session.state.lastActivity = currentTime;
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            session.config.onComplete?.(response);
            resolve(response);
          } catch (error) {
            reject(this.createDetailedError('server_internal', 'Invalid response format from server'));
          }
        } else {
          reject(this.createDetailedError(
            this.categorizeHttpStatus(xhr.status),
            `Upload failed with status ${xhr.status}`,
            xhr.status,
            xhr.responseText
          ));
        }
      });

      xhr.addEventListener('error', () => {
        reject(this.createDetailedError('network_connection', 'Network error occurred during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(this.createDetailedError('cancelled', 'Upload was cancelled'));
      });

      xhr.addEventListener('timeout', () => {
        reject(this.createDetailedError('network_timeout', 'Upload request timed out'));
      });

      xhr.open('POST', endpoint);
      
      if (session.config.headers) {
        Object.entries(session.config.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      if (session.config.timeout) {
        xhr.timeout = session.config.timeout;
      }

      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.send(formData);
    });
  }

  private async uploadChunk(
    chunk: Blob,
    chunkIndex: number,
    session: UploadSession,
    controller: AbortController
  ): Promise<any> {
    const { config, state } = session;
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', state.totalChunks.toString());
    formData.append('sessionId', state.sessionId);
    
    if (config.metadata) {
      formData.append('metadata', JSON.stringify(config.metadata));
    }

    return this.executeUploadRequest(session, formData, `${config.endpoint}/chunk`, controller);
  }

  private async finalizeChunkedUpload(session: UploadSession, controller: AbortController): Promise<any> {
    const { config, state } = session;
    
    try {
      const response = await fetch(`${config.endpoint}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          totalChunks: state.totalChunks,
          metadata: config.metadata
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw this.createDetailedError(
          this.categorizeHttpStatus(response.status),
          `Finalization failed with status ${response.status}`,
          response.status,
          await response.text()
        );
      }

      const result = await response.json();
      config.onComplete?.(result);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw this.createDetailedError('cancelled', 'Upload finalization was cancelled');
      }
      throw this.categorizeError(error, session.blob, config);
    }
  }

  private categorizeError(error: any, blob: Blob, config: UploadConfig): DetailedUploadError {
    if (error.type) {
      return error as DetailedUploadError;
    }

    if (error.name === 'AbortError') {
      return this.createDetailedError('cancelled', 'Upload was cancelled by user');
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return this.createDetailedError('network_connection', 'Network connection failed');
    }

    if (error.statusCode) {
      return this.createDetailedError(
        this.categorizeHttpStatus(error.statusCode),
        error.message || `HTTP ${error.statusCode} error`,
        error.statusCode,
        error.details
      );
    }

    return this.createDetailedError('unknown', error.message || 'An unknown error occurred');
  }

  private categorizeHttpStatus(status: number): DetailedUploadError['type'] {
    if (status === 400) return 'client_invalid_request';
    if (status === 401) return 'client_unauthorized';
    if (status === 403) return 'client_forbidden';
    if (status === 404) return 'client_not_found';
    if (status === 413) return 'client_payload_too_large';
    if (status >= 400 && status < 500) return 'client_invalid_request';
    if (status === 500) return 'server_internal';
    if (status === 502 || status === 503) return 'server_unavailable';
    if (status === 504) return 'server_gateway_timeout';
    if (status >= 500) return 'server_internal';
    return 'unknown';
  }

  private createDetailedError(
    type: DetailedUploadError['type'],
    message: string,
    statusCode?: number,
    details?: any
  ): DetailedUploadError {
    const category = this.getErrorCategory(type);
    const errorInfo = this.getErrorInfo(type, message, statusCode);
    
    return {
      type,
      category,
      message,
      statusCode,
      details,
      retryable: errorInfo.retryable,
      autoRetryable: errorInfo.autoRetryable,
      manualRetryable: errorInfo.manualRetryable,
      suggestedAction: errorInfo.suggestedAction,
      userFriendlyMessage: errorInfo.userFriendlyMessage,
      technicalDetails: errorInfo.technicalDetails,
      recoveryOptions: errorInfo.recoveryOptions
    };
  }

  private getErrorCategory(type: DetailedUploadError['type']): DetailedUploadError['category'] {
    if (type.startsWith('network_')) return 'network';
    if (type.startsWith('client_')) return 'client';
    if (type.startsWith('server_')) return 'server';
    if (type.startsWith('validation_')) return 'validation';
    if (type.startsWith('session_') || type === 'chunk_missing') return 'session';
    if (type === 'cancelled') return 'user_action';
    return 'unknown';
  }

  private getErrorInfo(type: DetailedUploadError['type'], message: string, statusCode?: number) {
    const errorInfoMap: Record<string, {
      retryable: boolean;
      autoRetryable: boolean;
      manualRetryable: boolean;
      suggestedAction: string;
      userFriendlyMessage: string;
      technicalDetails: string;
      recoveryOptions: RecoveryOption[];
    }> = {
      network_timeout: {
        retryable: true,
        autoRetryable: true,
        manualRetryable: true,
        suggestedAction: 'Check your internet connection and try again',
        userFriendlyMessage: 'The upload timed out. This usually happens with slow internet connections.',
        technicalDetails: 'Network request exceeded timeout limit',
        recoveryOptions: [
          { id: 'retry', label: 'Try Again', description: 'Retry the upload with the same settings', action: 'retry', primary: true },
          { id: 'retry_smaller_chunks', label: 'Use Smaller Chunks', description: 'Retry with smaller file chunks for better reliability', action: 'retry_with_smaller_chunks' },
          { id: 'check_connection', label: 'Check Connection', description: 'Test your internet connection', action: 'check_connection' }
        ]
      },
      network_offline: {
        retryable: true,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Connect to the internet and try again',
        userFriendlyMessage: 'No internet connection detected. Please check your network settings.',
        technicalDetails: 'Device is offline (navigator.onLine = false)',
        recoveryOptions: [
          { id: 'check_connection', label: 'Check Connection', description: 'Verify your internet connection', action: 'check_connection', primary: true },
          { id: 'retry', label: 'Try Again', description: 'Retry once connected', action: 'retry' }
        ]
      },
      network_connection: {
        retryable: true,
        autoRetryable: true,
        manualRetryable: true,
        suggestedAction: 'Check your internet connection or try again later',
        userFriendlyMessage: 'Unable to connect to the upload server. This might be a temporary network issue.',
        technicalDetails: 'Network connection failed during request',
        recoveryOptions: [
          { id: 'retry', label: 'Try Again', description: 'Retry the upload', action: 'retry', primary: true },
          { id: 'check_connection', label: 'Check Connection', description: 'Test your internet connection', action: 'check_connection' },
          { id: 'refresh_page', label: 'Refresh Page', description: 'Reload the page and try again', action: 'refresh_page' }
        ]
      },
      client_invalid_request: {
        retryable: false,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Try recording a new audio file',
        userFriendlyMessage: 'The upload request was invalid. This might be due to file corruption.',
        technicalDetails: `HTTP ${statusCode}: Invalid request format or parameters`,
        recoveryOptions: [
          { id: 'try_different_file', label: 'Record New Audio', description: 'Record a fresh audio file and try again', action: 'try_different_file', primary: true },
          { id: 'contact_support', label: 'Contact Support', description: 'Report this issue for assistance', action: 'contact_support' }
        ]
      },
      client_payload_too_large: {
        retryable: true,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Try uploading with smaller chunks or record a shorter audio',
        userFriendlyMessage: 'The audio file is too large for the server to accept.',
        technicalDetails: 'HTTP 413: Request payload exceeds server limits',
        recoveryOptions: [
          { id: 'retry_smaller_chunks', label: 'Use Smaller Chunks', description: 'Break the file into smaller pieces', action: 'retry_with_smaller_chunks', primary: true },
          { id: 'try_different_file', label: 'Record Shorter Audio', description: 'Record a shorter audio file', action: 'try_different_file' }
        ]
      },
      server_internal: {
        retryable: true,
        autoRetryable: true,
        manualRetryable: true,
        suggestedAction: 'Wait a moment and try again',
        userFriendlyMessage: 'The server encountered an internal error. This is usually temporary.',
        technicalDetails: `HTTP ${statusCode}: Internal server error`,
        recoveryOptions: [
          { id: 'retry', label: 'Try Again', description: 'Retry the upload after a brief wait', action: 'retry', primary: true },
          { id: 'contact_support', label: 'Contact Support', description: 'Report persistent server errors', action: 'contact_support' }
        ]
      },
      server_unavailable: {
        retryable: true,
        autoRetryable: true,
        manualRetryable: true,
        suggestedAction: 'Wait a few minutes and try again',
        userFriendlyMessage: 'The upload server is temporarily unavailable or overloaded.',
        technicalDetails: `HTTP ${statusCode}: Service unavailable`,
        recoveryOptions: [
          { id: 'retry', label: 'Try Again Later', description: 'Wait a few minutes and retry', action: 'retry', primary: true },
          { id: 'contact_support', label: 'Contact Support', description: 'Report extended outages', action: 'contact_support' }
        ]
      },
      validation_file_corrupted: {
        retryable: false,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Record a new audio file',
        userFriendlyMessage: 'The audio file appears to be corrupted or empty.',
        technicalDetails: 'File validation failed: corrupted or empty file',
        recoveryOptions: [
          { id: 'try_different_file', label: 'Record New Audio', description: 'Create a fresh recording', action: 'try_different_file', primary: true },
          { id: 'refresh_page', label: 'Refresh Page', description: 'Reload and start over', action: 'refresh_page' }
        ]
      },
      validation_too_large: {
        retryable: false,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Record a shorter audio file',
        userFriendlyMessage: 'The audio file exceeds the maximum allowed size.',
        technicalDetails: 'File size validation failed: exceeds size limits',
        recoveryOptions: [
          { id: 'try_different_file', label: 'Record Shorter Audio', description: 'Create a shorter recording', action: 'try_different_file', primary: true },
          { id: 'retry_smaller_chunks', label: 'Try Chunked Upload', description: 'Attempt upload with smaller chunks', action: 'retry_with_smaller_chunks' }
        ]
      },
      cancelled: {
        retryable: true,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Click upload again to restart',
        userFriendlyMessage: 'Upload was cancelled by you.',
        technicalDetails: 'User cancelled the upload operation',
        recoveryOptions: [
          { id: 'retry', label: 'Start Upload Again', description: 'Restart the upload process', action: 'retry', primary: true }
        ]
      }
    };

    return errorInfoMap[type] || {
      retryable: true,
      autoRetryable: false,
      manualRetryable: true,
      suggestedAction: 'Try the upload again',
      userFriendlyMessage: 'An unexpected error occurred during upload.',
      technicalDetails: message,
      recoveryOptions: [
        { id: 'retry', label: 'Try Again', description: 'Retry the upload', action: 'retry', primary: true },
        { id: 'refresh_page', label: 'Refresh Page', description: 'Reload the page and start over', action: 'refresh_page' },
        { id: 'contact_support', label: 'Contact Support', description: 'Report this issue', action: 'contact_support' }
      ]
    };
  }

  // Manual recovery methods
  async retryUpload(uploadId: string, options?: { smallerChunks?: boolean; withoutChunks?: boolean }): Promise<any> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    // Update retry count
    session.retryCount++;

    // Modify config based on options
    if (options?.smallerChunks && session.config.chunkSize) {
      session.config.chunkSize = Math.max(session.config.chunkSize / 2, 1024 * 1024); // Minimum 1MB
    }
    
    if (options?.withoutChunks) {
      session.config.enableChunking = false;
    }

    // Reset state for retry
    session.state.uploadedChunks.clear();
    session.state.failedChunks.clear();
    session.state.chunkProgress.clear();
    session.state.lastActivity = Date.now();

    // Retry the upload
    return this.uploadAudioBlob(session.blob, session.config, uploadId);
  }

  async cleanupFailedSession(uploadId: string): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) return;

    try {
      // Attempt to notify server about cleanup
      if (session.state.sessionId && session.config.endpoint) {
        await fetch(`${session.config.endpoint}/cleanup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...session.config.headers
          },
          body: JSON.stringify({
            sessionId: session.state.sessionId,
            uploadedChunks: Array.from(session.state.uploadedChunks)
          }),
          signal: AbortSignal.timeout(5000)
        }).catch(() => {
          // Ignore cleanup errors - they're not critical
          console.warn('Failed to notify server about session cleanup');
        });
      }
    } finally {
      // Always clean up local state
      this.forceCleanup(uploadId);
    }
  }

  cancelUpload(uploadId: string): void {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
    }
    this.scheduleCleanup(uploadId);
  }

  getUploadProgress(uploadId: string): UploadProgress | null {
    return this.progressTrackers.get(uploadId) || null;
  }

  getUploadSession(uploadId: string): UploadSession | null {
    return this.uploadSessions.get(uploadId) || null;
  }

  // Cleanup methods
  private scheduleCleanup(uploadId: string, delay = 300000): void { // 5 minutes
    const existingTimer = this.cleanupTimers.get(uploadId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.forceCleanup(uploadId);
    }, delay);
    
    this.cleanupTimers.set(uploadId, timer);
  }

  private forceCleanup(uploadId: string): void {
    this.activeUploads.delete(uploadId);
    this.uploadSessions.delete(uploadId);
    this.progressTrackers.delete(uploadId);
    
    const timer = this.cleanupTimers.get(uploadId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(uploadId);
    }
  }

  // Utility methods
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

export const enhancedUploadService = new EnhancedUploadService();