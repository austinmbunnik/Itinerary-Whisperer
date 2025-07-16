export interface AudioValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  metadata?: AudioMetadata;
}

export interface AudioMetadata {
  duration: number;
  size: number;
  mimeType: string;
  codec: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

export interface ProcessedAudioBlob {
  blob: Blob;
  metadata: AudioMetadata;
  uploadFormat: string;
}

export interface AudioProcessingConfig {
  maxSizeBytes: number;
  maxDurationMinutes: number;
  supportedFormats: string[];
  preferredUploadFormat: string;
  qualityThresholds: {
    minBitrate: number;
    maxBitrate: number;
    preferredSampleRate: number;
  };
}

export class AudioProcessor {
  private config: AudioProcessingConfig;

  constructor(config?: Partial<AudioProcessingConfig>) {
    this.config = {
      maxSizeBytes: 100 * 1024 * 1024, // 100MB
      maxDurationMinutes: 60,
      supportedFormats: [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/ogg;codecs=vorbis'
      ],
      preferredUploadFormat: 'audio/webm;codecs=opus',
      qualityThresholds: {
        minBitrate: 32000,
        maxBitrate: 320000,
        preferredSampleRate: 48000
      },
      ...config
    };
  }

  async processAudioBlob(blob: Blob): Promise<ProcessedAudioBlob> {
    const validation = await this.validateAudioBlob(blob);
    
    if (!validation.isValid) {
      throw new Error(validation.error || 'Audio validation failed');
    }

    const convertedBlob = await this.convertToUploadFormat(blob);
    const metadata = validation.metadata!;

    return {
      blob: convertedBlob,
      metadata,
      uploadFormat: this.config.preferredUploadFormat
    };
  }

  async validateAudioBlob(blob: Blob): Promise<AudioValidationResult> {
    const warnings: string[] = [];

    try {
      // Basic blob validation
      if (!blob || blob.size === 0) {
        return {
          isValid: false,
          error: 'Audio file is empty or corrupted'
        };
      }

      // Size validation
      if (blob.size > this.config.maxSizeBytes) {
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
        const maxSizeMB = (this.config.maxSizeBytes / (1024 * 1024)).toFixed(0);
        return {
          isValid: false,
          error: `Audio file is too large (${sizeMB}MB). Maximum allowed size is ${maxSizeMB}MB`
        };
      }

      // MIME type validation
      const mimeType = blob.type || 'unknown';
      if (!this.isSupportedFormat(mimeType)) {
        return {
          isValid: false,
          error: `Unsupported audio format: ${mimeType}. Supported formats: ${this.config.supportedFormats.join(', ')}`
        };
      }

      // Estimate duration and other metadata
      const metadata = await this.extractAudioMetadata(blob);

      // Duration validation
      if (metadata.duration > this.config.maxDurationMinutes * 60 * 1000) {
        const durationMinutes = (metadata.duration / (60 * 1000)).toFixed(1);
        return {
          isValid: false,
          error: `Audio recording is too long (${durationMinutes} minutes). Maximum allowed duration is ${this.config.maxDurationMinutes} minutes`
        };
      }

      // Quality warnings
      if (metadata.bitrate && metadata.bitrate < this.config.qualityThresholds.minBitrate) {
        warnings.push(`Low audio quality detected (${metadata.bitrate} bps). Transcription accuracy may be reduced.`);
      }

      // Size vs duration warnings
      const expectedSizePerMinute = 1024 * 1024; // ~1MB per minute
      const durationMinutes = metadata.duration / (60 * 1000);
      const expectedSize = durationMinutes * expectedSizePerMinute;
      
      if (blob.size < expectedSize * 0.3) {
        warnings.push('Audio file seems unusually small for its duration. Please check recording quality.');
      }

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate audio file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private isSupportedFormat(mimeType: string): boolean {
    return this.config.supportedFormats.some(format => 
      mimeType.toLowerCase().includes(format.toLowerCase()) ||
      format.toLowerCase().includes(mimeType.toLowerCase())
    );
  }

  private async extractAudioMetadata(blob: Blob): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      
      let resolved = false;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.remove();
      };

      const onLoadedMetadata = () => {
        if (resolved) return;
        resolved = true;
        
        const metadata: AudioMetadata = {
          duration: audio.duration * 1000, // Convert to milliseconds
          size: blob.size,
          mimeType: blob.type,
          codec: this.extractCodecFromMimeType(blob.type),
          sampleRate: this.estimateSampleRate(blob),
          channels: this.estimateChannels(blob)
        };

        // Estimate bitrate
        if (audio.duration > 0) {
          metadata.bitrate = Math.round((blob.size * 8) / audio.duration);
        }

        cleanup();
        resolve(metadata);
      };

      const onError = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        
        // Fallback metadata estimation
        const fallbackMetadata: AudioMetadata = {
          duration: this.estimateDurationFromSize(blob),
          size: blob.size,
          mimeType: blob.type,
          codec: this.extractCodecFromMimeType(blob.type)
        };
        
        resolve(fallbackMetadata);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('error', onError);
      audio.addEventListener('abort', onError);
      
      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          console.warn('Audio metadata loading timed out, using fallback estimation');
          onError();
        }
      }, 5000);

      audio.src = url;
      audio.load();
    });
  }

  private extractCodecFromMimeType(mimeType: string): string {
    if (mimeType.includes('opus')) return 'opus';
    if (mimeType.includes('vorbis')) return 'vorbis';
    if (mimeType.includes('mp4a')) return 'aac';
    if (mimeType.includes('webm')) return 'opus'; // Default for webm
    if (mimeType.includes('mp4')) return 'aac'; // Default for mp4
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'pcm';
    if (mimeType.includes('ogg')) return 'vorbis';
    return 'unknown';
  }

  private estimateDurationFromSize(blob: Blob): number {
    // Rough estimation: assume ~128kbps average bitrate
    const estimatedBitrate = 128000; // bits per second
    const durationSeconds = (blob.size * 8) / estimatedBitrate;
    return durationSeconds * 1000; // Convert to milliseconds
  }

  private estimateSampleRate(blob: Blob): number {
    // Common sample rates based on format
    const mimeType = blob.type.toLowerCase();
    if (mimeType.includes('webm') || mimeType.includes('opus')) return 48000;
    if (mimeType.includes('mp4') || mimeType.includes('aac')) return 44100;
    if (mimeType.includes('wav')) return 44100;
    return 44100; // Default
  }

  private estimateChannels(blob: Blob): number {
    // Most recordings are mono for speech
    return 1;
  }

  private async convertToUploadFormat(blob: Blob): Promise<Blob> {
    // If already in preferred format, return as-is
    if (blob.type === this.config.preferredUploadFormat || 
        blob.type.includes(this.config.preferredUploadFormat)) {
      return blob;
    }

    // For now, return the original blob
    // In a full implementation, you might use Web Audio API for conversion
    console.info(`Audio format conversion not implemented. Using original format: ${blob.type}`);
    return blob;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getValidationErrorMessage(error: string): string {
    // User-friendly error messages
    const errorMap: Record<string, string> = {
      'empty': 'No audio was recorded. Please try recording again.',
      'too large': 'The recording is too large to upload. Try recording a shorter segment.',
      'too long': 'The recording exceeds the maximum duration limit.',
      'unsupported': 'This audio format is not supported. Please use a different browser or device.',
      'corrupted': 'The audio file appears to be corrupted. Please try recording again.',
      'permission': 'Microphone permission is required to process audio recordings.'
    };

    const lowerError = error.toLowerCase();
    for (const [key, message] of Object.entries(errorMap)) {
      if (lowerError.includes(key)) {
        return message;
      }
    }

    return error; // Return original error if no mapping found
  }

  async validateAudioData(arrayBuffer: ArrayBuffer, mimeType: string): Promise<boolean> {
    try {
      // Basic header validation for common formats
      const view = new DataView(arrayBuffer);
      
      if (mimeType.includes('webm')) {
        // WebM files start with EBML header (0x1A45DFA3)
        return view.getUint32(0) === 0x1A45DFA3;
      }
      
      if (mimeType.includes('wav')) {
        // WAV files start with "RIFF" and contain "WAVE"
        const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
        return riff === 'RIFF' && wave === 'WAVE';
      }
      
      if (mimeType.includes('mp4')) {
        // MP4 files typically have ftyp box starting at offset 4
        const ftyp = String.fromCharCode(view.getUint8(4), view.getUint8(5), view.getUint8(6), view.getUint8(7));
        return ftyp === 'ftyp';
      }
      
      if (mimeType.includes('ogg')) {
        // OGG files start with "OggS"
        const oggs = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        return oggs === 'OggS';
      }
      
      // For other formats or if we can't validate, assume valid
      return true;
      
    } catch (error) {
      console.warn('Audio data validation failed:', error);
      return false;
    }
  }
}

export const createAudioProcessor = (config?: Partial<AudioProcessingConfig>): AudioProcessor => {
  return new AudioProcessor(config);
};