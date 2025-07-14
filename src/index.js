// Backend entry point for Itinerary-Whisperer voice-to-text application
// Express.js server with Whisper API integration

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send('Itinerary-Whisperer API Server');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});