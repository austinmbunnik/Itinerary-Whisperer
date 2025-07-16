export interface TranscriptionConfig {
  apiKey?: string;
  endpoint: string;
  model?: string;
  language?: string;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
  language?: string;
  segments?: TranscriptionSegment[];
  metadata?: {
    processingTime: number;
    audioFormat: string;
    audioSize: number;
    modelUsed: string;
    travelContext?: TravelAnalysis;
  };
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
}

export interface TravelAnalysis {
  destinations: string[];
  dates: string[];
  activities: string[];
  accommodations: string[];
  transportation: string[];
  budget: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedDuration: number; // in days
  travelStyle: 'budget' | 'mid-range' | 'luxury' | 'mixed';
}

export interface TranscriptionError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

export class TranscriptionService {
  private config: TranscriptionConfig;

  constructor(config: TranscriptionConfig) {
    this.config = {
      model: 'whisper-1',
      language: 'en',
      temperature: 0.1,
      maxRetries: 3,
      timeout: 120000, // 2 minutes
      ...config
    };
  }

  async transcribeAudio(audioBlob: Blob, progressCallback?: (progress: number) => void): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio file');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', this.config.model || 'whisper-1');
      formData.append('language', this.config.language || 'en');
      formData.append('temperature', (this.config.temperature || 0.1).toString());
      formData.append('response_format', 'verbose_json');
      
      // Add travel-specific instructions
      formData.append('prompt', 'This is a conversation about travel planning. Pay attention to destinations, dates, activities, accommodations, and transportation preferences.');

      let retryCount = 0;
      const maxRetries = this.config.maxRetries || 3;

      while (retryCount <= maxRetries) {
        try {
          progressCallback?.(10 + (retryCount * 20)); // Show progress based on retry

          const response = await this.makeTranscriptionRequest(formData, progressCallback);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
          }

          progressCallback?.(80);

          const result = await response.json();
          progressCallback?.(90);

          // Process and analyze the result
          const processedResult = await this.processTranscriptionResult(result, audioBlob, startTime);
          progressCallback?.(100);

          return processedResult;

        } catch (error: any) {
          retryCount++;
          
          if (retryCount > maxRetries) {
            throw this.createTranscriptionError(error, audioBlob);
          }

          // Wait before retry with exponential backoff
          await this.delay(Math.pow(2, retryCount) * 1000);
        }
      }

      throw new Error('Max retries exceeded');

    } catch (error: any) {
      throw this.createTranscriptionError(error, audioBlob);
    }
  }

  private async makeTranscriptionRequest(formData: FormData, progressCallback?: (progress: number) => void): Promise<Response> {
    // For development/demo purposes, use mock endpoint or OpenAI API
    const endpoint = this.config.endpoint;
    
    const headers: Record<string, string> = {};
    
    // Add API key if provided (for OpenAI API)
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const uploadProgress = Math.round((event.loaded / event.total) * 70); // Upload is 70% of total
          progressCallback?.(10 + uploadProgress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Create a Response-like object
          const response = {
            ok: true,
            status: xhr.status,
            json: async () => JSON.parse(xhr.responseText),
            text: async () => xhr.responseText
          } as Response;
          resolve(response);
        } else {
          const response = {
            ok: false,
            status: xhr.status,
            text: async () => xhr.responseText
          } as Response;
          resolve(response);
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during transcription'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Transcription request timed out'));
      });

      xhr.open('POST', endpoint);
      
      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      
      if (this.config.timeout) {
        xhr.timeout = this.config.timeout;
      }

      xhr.send(formData);
    });
  }

  private async processTranscriptionResult(apiResult: any, audioBlob: Blob, startTime: number): Promise<TranscriptionResult> {
    const processingTime = Date.now() - startTime;
    
    // Handle different API response formats
    let transcript = '';
    let segments: TranscriptionSegment[] = [];
    let confidence = 0;
    let duration = 0;

    if (apiResult.text) {
      // OpenAI Whisper format
      transcript = apiResult.text;
      segments = apiResult.segments || [];
      duration = apiResult.duration || 0;
      
      // Calculate average confidence
      if (segments.length > 0) {
        confidence = segments.reduce((sum, seg) => sum + (seg.avg_logprob || 0), 0) / segments.length;
        confidence = Math.max(0, Math.min(1, (confidence + 1) / 2)); // Convert log prob to 0-1 scale
      }
    } else if (apiResult.transcript) {
      // Custom API format
      transcript = apiResult.transcript;
      confidence = apiResult.confidence || 0.8;
      duration = apiResult.duration || 0;
    } else {
      throw new Error('Invalid transcription response format');
    }

    // Analyze travel context
    const travelContext = this.analyzeTravelContent(transcript);

    return {
      transcript: transcript.trim(),
      confidence,
      duration,
      language: apiResult.language || this.config.language,
      segments: segments.map(seg => ({
        start: seg.start || 0,
        end: seg.end || 0,
        text: seg.text || '',
        confidence: seg.avg_logprob ? Math.max(0, Math.min(1, (seg.avg_logprob + 1) / 2)) : 0.8,
        speaker: seg.speaker || undefined
      })),
      metadata: {
        processingTime,
        audioFormat: audioBlob.type,
        audioSize: audioBlob.size,
        modelUsed: this.config.model || 'whisper-1',
        travelContext
      }
    };
  }

  private analyzeTravelContent(transcript: string): TravelAnalysis {
    const text = transcript.toLowerCase();
    
    // Extract destinations
    const destinationPatterns = [
      /(?:go to|visit|traveling to|trip to|vacation in|holiday in)\s+([a-z\s]+?)(?:\.|,|!|\?|$)/g,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b(?=.*(?:city|country|state|island|beach|mountain))/g
    ];
    
    const destinations: string[] = [];
    destinationPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && match[1].length > 2) {
          destinations.push(match[1].trim());
        }
      });
    });

    // Extract dates
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/g,
      /\b(next|this)\s+(week|month|year|summer|winter|spring|fall|autumn)\b/g
    ];
    
    const dates: string[] = [];
    datePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => dates.push(match[0]));
    });

    // Extract activities
    const activityKeywords = [
      'restaurant', 'food', 'eat', 'dining', 'museum', 'gallery', 'tour', 'sightseeing',
      'beach', 'swimming', 'hiking', 'walking', 'shopping', 'nightlife', 'show', 'concert',
      'park', 'garden', 'temple', 'church', 'cathedral', 'monument', 'landmark'
    ];
    
    const activities = activityKeywords.filter(keyword => text.includes(keyword));

    // Extract accommodations
    const accommodationKeywords = ['hotel', 'airbnb', 'hostel', 'resort', 'inn', 'bnb', 'lodge', 'ryokan'];
    const accommodations = accommodationKeywords.filter(keyword => text.includes(keyword));

    // Extract transportation
    const transportationKeywords = ['flight', 'plane', 'train', 'bus', 'car', 'rental', 'uber', 'taxi', 'metro', 'subway'];
    const transportation = transportationKeywords.filter(keyword => text.includes(keyword));

    // Extract budget mentions
    const budgetKeywords = ['budget', 'cheap', 'expensive', 'cost', 'price', 'money', 'dollar', 'euro', 'pound'];
    const budget = budgetKeywords.filter(keyword => text.includes(keyword));

    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    const complexityScore = destinations.length + activities.length + accommodations.length + transportation.length;
    
    if (complexityScore > 10) complexity = 'complex';
    else if (complexityScore > 5) complexity = 'moderate';

    // Estimate duration
    let estimatedDuration = 3; // default 3 days
    const durationMatches = text.match(/(\d+)\s*(?:day|night|week)/g);
    if (durationMatches) {
      const numbers = durationMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0'));
      estimatedDuration = Math.max(...numbers, 1);
    }

    // Determine travel style
    let travelStyle: 'budget' | 'mid-range' | 'luxury' | 'mixed' = 'mid-range';
    if (text.includes('budget') || text.includes('cheap') || text.includes('hostel')) {
      travelStyle = 'budget';
    } else if (text.includes('luxury') || text.includes('expensive') || text.includes('resort')) {
      travelStyle = 'luxury';
    } else if (budget.length > 0) {
      travelStyle = 'mixed';
    }

    return {
      destinations: [...new Set(destinations)],
      dates: [...new Set(dates)],
      activities: [...new Set(activities)],
      accommodations: [...new Set(accommodations)],
      transportation: [...new Set(transportation)],
      budget: [...new Set(budget)],
      complexity,
      estimatedDuration,
      travelStyle
    };
  }

  private createTranscriptionError(error: any, audioBlob: Blob): TranscriptionError {
    let code = 'unknown_error';
    let message = 'An unknown error occurred during transcription';
    let retryable = true;

    if (error.message) {
      if (error.message.includes('timeout')) {
        code = 'timeout_error';
        message = 'Transcription request timed out';
        retryable = true;
      } else if (error.message.includes('Network')) {
        code = 'network_error';
        message = 'Network error during transcription';
        retryable = true;
      } else if (error.message.includes('401')) {
        code = 'auth_error';
        message = 'Authentication failed - check API key';
        retryable = false;
      } else if (error.message.includes('413')) {
        code = 'file_too_large';
        message = 'Audio file is too large for transcription';
        retryable = false;
      } else if (error.message.includes('415')) {
        code = 'unsupported_format';
        message = 'Audio format not supported';
        retryable = false;
      } else {
        message = error.message;
      }
    }

    return {
      code,
      message,
      details: {
        originalError: error,
        audioSize: audioBlob.size,
        audioType: audioBlob.type
      },
      retryable
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock transcription for development
  static createMockService(): TranscriptionService {
    return new TranscriptionService({
      endpoint: '/api/mock-transcribe',
      apiKey: 'mock-key'
    });
  }

  // Factory method for different providers
  static createForProvider(provider: 'openai' | 'custom' | 'mock', config: Partial<TranscriptionConfig> = {}): TranscriptionService {
    switch (provider) {
      case 'openai':
        return new TranscriptionService({
          endpoint: 'https://api.openai.com/v1/audio/transcriptions',
          ...config
        });
      case 'mock':
        return TranscriptionService.createMockService();
      case 'custom':
      default:
        return new TranscriptionService({
          endpoint: process.env.REACT_APP_TRANSCRIPTION_ENDPOINT || '/api/transcribe',
          ...config
        });
    }
  }
}

// Export singleton instance
export const transcriptionService = TranscriptionService.createForProvider(
  (process.env.REACT_APP_TRANSCRIPTION_PROVIDER as any) || 'custom',
  {
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    endpoint: process.env.REACT_APP_TRANSCRIPTION_ENDPOINT
  }
);