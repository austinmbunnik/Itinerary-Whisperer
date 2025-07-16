/**
 * Application Configuration
 * Centralized configuration management for the Itinerary Whisperer app
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    transcriptionEndpoint: string;
    uploadEndpoint: string;
    timeout: number;
  };
  
  transcription: {
    provider: 'openai' | 'custom' | 'mock';
    apiKey?: string;
    model: string;
    language: string;
    temperature: number;
    maxRetries: number;
    timeout: number;
    autoTranscribe: boolean;
  };
  
  upload: {
    maxFileSize: number;
    chunkSize: number;
    enableChunking: boolean;
    maxRetries: number;
    timeout: number;
    supportedFormats: string[];
  };
  
  features: {
    travelAnalysis: boolean;
    errorRecovery: boolean;
    debugMode: boolean;
    mockServices: boolean;
  };
  
  ui: {
    notificationTimeout: number;
    errorNotificationTimeout: number;
    animationDuration: number;
  };
  
  travel: {
    complexityThreshold: number;
    defaultTripDuration: number;
    maxDestinations: number;
  };
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Create configuration object from environment variables
export const appConfig: AppConfig = {
  api: {
    baseUrl: getEnvVar('REACT_APP_API_URL', 'http://localhost:3001/api'),
    transcriptionEndpoint: getEnvVar('REACT_APP_TRANSCRIPTION_ENDPOINT', 'http://localhost:3001/api/transcribe'),
    uploadEndpoint: getEnvVar('REACT_APP_UPLOAD_ENDPOINT', 'http://localhost:3001/api/upload'),
    timeout: getEnvNumber('REACT_APP_API_TIMEOUT', 30000)
  },
  
  transcription: {
    provider: getEnvVar('REACT_APP_TRANSCRIPTION_PROVIDER', 'custom') as 'openai' | 'custom' | 'mock',
    apiKey: getEnvVar('REACT_APP_OPENAI_API_KEY'),
    model: getEnvVar('REACT_APP_TRANSCRIPTION_MODEL', 'whisper-1'),
    language: getEnvVar('REACT_APP_TRANSCRIPTION_LANGUAGE', 'en'),
    temperature: getEnvNumber('REACT_APP_TRANSCRIPTION_TEMPERATURE', 0.1) / 10,
    maxRetries: getEnvNumber('REACT_APP_MAX_TRANSCRIPTION_RETRIES', 3),
    timeout: getEnvNumber('REACT_APP_TRANSCRIPTION_TIMEOUT', 120000),
    autoTranscribe: getEnvBoolean('REACT_APP_ENABLE_AUTO_TRANSCRIPTION', true)
  },
  
  upload: {
    maxFileSize: getEnvNumber('REACT_APP_MAX_FILE_SIZE', 104857600), // 100MB
    chunkSize: getEnvNumber('REACT_APP_CHUNK_SIZE', 5242880), // 5MB
    enableChunking: getEnvBoolean('REACT_APP_ENABLE_CHUNKED_UPLOADS', true),
    maxRetries: getEnvNumber('REACT_APP_MAX_UPLOAD_RETRIES', 3),
    timeout: getEnvNumber('REACT_APP_UPLOAD_TIMEOUT', 300000), // 5 minutes
    supportedFormats: getEnvVar(
      'REACT_APP_ALLOWED_AUDIO_FORMATS', 
      'audio/webm,audio/mp4,audio/wav,audio/ogg'
    ).split(',')
  },
  
  features: {
    travelAnalysis: getEnvBoolean('REACT_APP_ENABLE_TRAVEL_ANALYSIS', true),
    errorRecovery: getEnvBoolean('REACT_APP_ENABLE_ERROR_RECOVERY', true),
    debugMode: getEnvBoolean('REACT_APP_DEBUG_MODE', false),
    mockServices: getEnvBoolean('REACT_APP_MOCK_TRANSCRIPTION', false)
  },
  
  ui: {
    notificationTimeout: getEnvNumber('REACT_APP_NOTIFICATION_TIMEOUT', 5000),
    errorNotificationTimeout: getEnvNumber('REACT_APP_ERROR_NOTIFICATION_TIMEOUT', 8000),
    animationDuration: getEnvNumber('REACT_APP_ANIMATION_DURATION', 300)
  },
  
  travel: {
    complexityThreshold: getEnvNumber('REACT_APP_TRAVEL_COMPLEXITY_THRESHOLD', 5),
    defaultTripDuration: getEnvNumber('REACT_APP_DEFAULT_TRIP_DURATION', 3),
    maxDestinations: getEnvNumber('REACT_APP_MAX_DESTINATIONS', 10)
  }
};

// Configuration validation
export const validateConfig = (): string[] => {
  const errors: string[] = [];
  
  // Validate required endpoints
  if (!appConfig.api.baseUrl) {
    errors.push('API base URL is required');
  }
  
  if (!appConfig.api.transcriptionEndpoint) {
    errors.push('Transcription endpoint is required');
  }
  
  if (!appConfig.api.uploadEndpoint) {
    errors.push('Upload endpoint is required');
  }
  
  // Validate OpenAI configuration if using OpenAI provider
  if (appConfig.transcription.provider === 'openai' && !appConfig.transcription.apiKey) {
    errors.push('OpenAI API key is required when using OpenAI provider');
  }
  
  // Validate file size limits
  if (appConfig.upload.maxFileSize < 1024 * 1024) { // Minimum 1MB
    errors.push('Maximum file size should be at least 1MB');
  }
  
  if (appConfig.upload.chunkSize > appConfig.upload.maxFileSize) {
    errors.push('Chunk size cannot be larger than maximum file size');
  }
  
  // Validate timeouts
  if (appConfig.transcription.timeout < 10000) { // Minimum 10 seconds
    errors.push('Transcription timeout should be at least 10 seconds');
  }
  
  if (appConfig.upload.timeout < 30000) { // Minimum 30 seconds
    errors.push('Upload timeout should be at least 30 seconds');
  }
  
  return errors;
};

// Helper functions
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const shouldUseMockServices = (): boolean => {
  return isDevelopment() && appConfig.features.mockServices;
};

export const getApiEndpoint = (path: string): string => {
  return `${appConfig.api.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getMaxFileSizeDisplay = (): string => {
  return formatFileSize(appConfig.upload.maxFileSize);
};

export const getChunkSizeDisplay = (): string => {
  return formatFileSize(appConfig.upload.chunkSize);
};

// Debug logging (only in development)
if (isDevelopment() && appConfig.features.debugMode) {
  console.group('🔧 Itinerary Whisperer Configuration');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Base URL:', appConfig.api.baseUrl);
  console.log('Transcription Provider:', appConfig.transcription.provider);
  console.log('Max File Size:', getMaxFileSizeDisplay());
  console.log('Chunk Size:', getChunkSizeDisplay());
  console.log('Auto Transcription:', appConfig.transcription.autoTranscribe);
  console.log('Travel Analysis:', appConfig.features.travelAnalysis);
  console.log('Mock Services:', shouldUseMockServices());
  
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('⚠️ Configuration Errors:');
    configErrors.forEach(error => console.error(`  - ${error}`));
  } else {
    console.log('✅ Configuration is valid');
  }
  console.groupEnd();
}

export default appConfig;