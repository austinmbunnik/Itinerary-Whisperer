require('dotenv').config();

/**
 * Environment variable validation and configuration management
 * This module validates required environment variables and provides defaults
 */

class EnvironmentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

/**
 * Validates that required environment variables are present
 * @param {Array<string>} requiredVars - Array of required environment variable names
 * @throws {EnvironmentError} If any required variables are missing
 */
const validateRequiredVars = (requiredVars) => {
  const missing = requiredVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    throw new EnvironmentError(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

/**
 * Validates that environment variables match expected patterns
 * @param {Object} validationRules - Object with env var names as keys and validation functions as values
 * @throws {EnvironmentError} If any variables fail validation
 */
const validateVarFormats = (validationRules) => {
  const errors = [];

  Object.entries(validationRules).forEach(([varName, validator]) => {
    const value = process.env[varName];
    if (value && !validator(value)) {
      errors.push(`${varName} has invalid format: ${value}`);
    }
  });

  if (errors.length > 0) {
    throw new EnvironmentError(`Environment variable validation errors:\n${errors.join('\n')}`);
  }
};

/**
 * Parses environment variable as integer with validation
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default value if parsing fails
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Parsed integer value
 */
const parseInteger = (value, defaultValue, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
  if (!value) {return defaultValue;}

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {return defaultValue;}
  if (parsed < min || parsed > max) {return defaultValue;}

  return parsed;
};

/**
 * Parses environment variable as boolean
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default value
 * @returns {boolean} Parsed boolean value
 */
const parseBoolean = (value, defaultValue = false) => {
  if (!value) {return defaultValue;}
  return value.toLowerCase() === 'true';
};

/**
 * Parses comma-separated values into array
 * @param {string} value - Environment variable value
 * @param {Array} defaultValue - Default array value
 * @returns {Array} Parsed array
 */
const parseArray = (value, defaultValue = []) => {
  if (!value) {return defaultValue;}
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
};

/**
 * Converts file size string to bytes
 * @param {string} sizeStr - Size string (e.g., "50MB", "1GB")
 * @returns {number} Size in bytes
 */
const parseFileSize = (sizeStr) => {
  if (!sizeStr) {return 52428800;} // 50MB default

  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) {return 52428800;} // 50MB default

  const [, size, unit] = match;
  return Math.floor(parseFloat(size) * units[unit.toUpperCase()]);
};

// Current environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Required variables based on environment
const getRequiredVars = () => {
  const baseRequired = ['NODE_ENV'];

  switch (NODE_ENV) {
    case 'production':
      return [
        ...baseRequired,
        'OPENAI_API_KEY',
        'BREVO_API_KEY',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'SESSION_SECRET'
      ];
    case 'staging':
      return [
        ...baseRequired,
        'OPENAI_API_KEY',
        'BREVO_API_KEY',
        'FIREBASE_PROJECT_ID'
      ];
    case 'development':
    case 'test':
    default:
      return baseRequired;
  }
};

// Validation rules for environment variables
const validationRules = {
  PORT: (value) => {
    const port = parseInt(value, 10);
    return !isNaN(port) && port > 0 && port <= 65535;
  },
  NODE_ENV: (value) => ['development', 'staging', 'production', 'test'].includes(value),
  EMAIL: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  URL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  OPENAI_API_KEY: (value) => value && value.startsWith('sk-') && value.length > 20,
  BREVO_API_KEY: (value) => value && value.startsWith('xkeysib-') && value.length > 20,
  SESSION_SECRET: (value) => value && value.length >= 32
};

// Warn about missing optional variables in development
const warnMissingOptional = () => {
  if (NODE_ENV === 'development') {
    const optionalVars = [
      'OPENAI_API_KEY',
      'BREVO_API_KEY',
      'FIREBASE_PROJECT_ID'
    ];

    const missing = optionalVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
      console.warn(
        `⚠️  Optional environment variables not set (features may be limited): ${missing.join(', ')}\n` +
        '   Copy .env.example to .env and configure these variables for full functionality.'
      );
    }
  }
};

// Validate environment variables
try {
  validateRequiredVars(getRequiredVars());

  // Custom validation rules
  const customValidations = {};

  if (process.env.PORT) {
    customValidations.PORT = validationRules.PORT;
  }

  if (process.env.NODE_ENV) {
    customValidations.NODE_ENV = validationRules.NODE_ENV;
  }

  if (process.env.FROM_EMAIL || process.env.REPLY_TO_EMAIL) {
    if (process.env.FROM_EMAIL) {customValidations.FROM_EMAIL = validationRules.EMAIL;}
    if (process.env.REPLY_TO_EMAIL) {customValidations.REPLY_TO_EMAIL = validationRules.EMAIL;}
  }

  if (process.env.BASE_URL || process.env.FRONTEND_URL) {
    if (process.env.BASE_URL) {customValidations.BASE_URL = validationRules.URL;}
    if (process.env.FRONTEND_URL) {customValidations.FRONTEND_URL = validationRules.URL;}
  }

  if (process.env.OPENAI_API_KEY) {
    customValidations.OPENAI_API_KEY = validationRules.OPENAI_API_KEY;
  }

  if (process.env.BREVO_API_KEY) {
    customValidations.BREVO_API_KEY = validationRules.BREVO_API_KEY;
  }

  if (process.env.SESSION_SECRET && NODE_ENV === 'production') {
    customValidations.SESSION_SECRET = validationRules.SESSION_SECRET;
  }

  validateVarFormats(customValidations);
  warnMissingOptional();

} catch (error) {
  console.error(`❌ Environment configuration error: ${error.message}`);
  process.exit(1);
}

// Export configuration object with validated and parsed values
const environment = {
  // Server configuration
  env: NODE_ENV,
  port: parseInteger(process.env.PORT, 3000, 1, 65535),
  host: process.env.HOST || 'localhost',

  // CORS configuration
  cors: {
    origin: parseArray(process.env.CORS_ORIGIN, ['http://localhost:3000']),
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, true)
  },

  // Security configuration
  security: {
    helmetCspEnabled: parseBoolean(process.env.HELMET_CSP_ENABLED, true),
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 900000, 1000),
    rateLimitMaxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100, 1)
  },

  // API configuration
  api: {
    baseUrl: process.env.API_BASE_URL || '/api/v1',
    timeout: parseInteger(process.env.API_TIMEOUT, 30000, 1000)
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log'
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'whisper-1',
    maxRetries: parseInteger(process.env.OPENAI_MAX_RETRIES, 3, 0, 10),
    timeout: parseInteger(process.env.OPENAI_TIMEOUT, 60000, 5000)
  },

  // Email configuration
  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@itinerary-whisperer.com',
    fromName: process.env.FROM_NAME || 'Itinerary Whisperer',
    templateId: parseInteger(process.env.EMAIL_TEMPLATE_ID, 1, 1),
    replyToEmail: process.env.REPLY_TO_EMAIL || 'support@itinerary-whisperer.com'
  },

  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ?
      process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    databaseUrl: process.env.FIREBASE_DATABASE_URL
  },

  // File upload configuration
  upload: {
    maxFileSize: parseFileSize(process.env.MAX_FILE_SIZE),
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    allowedFileTypes: parseArray(process.env.ALLOWED_FILE_TYPES, [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg'
    ]),
    maxRecordingDuration: parseInteger(process.env.MAX_RECORDING_DURATION, 3600, 60, 7200)
  },

  // URL configuration
  urls: {
    base: process.env.BASE_URL || `http://localhost:${parseInteger(process.env.PORT, 3000)}`,
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
    cdn: process.env.CDN_URL || '',
    staticFiles: process.env.STATIC_FILES_URL || ''
  },

  // Feature flags (derived from environment)
  features: {
    emailEnabled: !!process.env.BREVO_API_KEY,
    transcriptionEnabled: !!process.env.OPENAI_API_KEY,
    firestoreEnabled: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL),
    developmentMode: NODE_ENV === 'development',
    productionMode: NODE_ENV === 'production'
  }
};

// Validate feature dependencies
if (environment.features.productionMode) {
  const requiredFeatures = ['emailEnabled', 'transcriptionEnabled', 'firestoreEnabled'];
  const missingFeatures = requiredFeatures.filter(feature => !environment.features[feature]);

  if (missingFeatures.length > 0) {
    console.error(
      '❌ Production mode requires all core features to be enabled.\n' +
      `Missing: ${missingFeatures.join(', ')}\n` +
      'Please configure the required environment variables.'
    );
    process.exit(1);
  }
}

// Log environment status
const featureStatus = Object.entries(environment.features)
  .map(([key, enabled]) => `${key}: ${enabled ? '✅' : '❌'}`)
  .join(', ');

console.log(`🚀 Environment: ${environment.env} (${featureStatus})`);

module.exports = environment;
