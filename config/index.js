// Configuration settings for Itinerary-Whisperer application

module.exports = {
  development: {
    port: process.env.PORT || 3000,
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'whisper-1'
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY
    },
    email: {
      brevoApiKey: process.env.BREVO_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@itinerary-whisperer.com'
    }
  },
  production: {
    port: process.env.PORT || 8080,
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'whisper-1'
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY
    },
    email: {
      brevoApiKey: process.env.BREVO_API_KEY,
      fromEmail: process.env.FROM_EMAIL
    }
  }
};