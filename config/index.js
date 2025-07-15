require('dotenv').config();

const requiredEnvVars = ['NODE_ENV'];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }
};

validateEnv();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  security: {
    helmetCspEnabled: process.env.HELMET_CSP_ENABLED === 'true'
  },

  api: {
    baseUrl: process.env.API_BASE_URL || '/api/v1'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'whisper-1'
  },

  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@itinerary-whisperer.com'
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  },

  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50MB',
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  }
};

module.exports = config;
