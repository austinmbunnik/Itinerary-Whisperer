**Instructions for Claude:**
Please refer to these tickets to understand the implementation plan for this web app.

# JIRA Epics and Tickets for Voice-to-Text Meeting Recorder

## Epic 1: Foundation & Project Setup
**Goal:** Establish the development environment, basic project structure, and deploy a minimal landing page

### Ticket 1.1: Initialize Project Structure
**Background:** Set up the foundational codebase with proper folder structure and development tooling
**Acceptance Criteria:**
- Git repository initialized with .gitignore for Node.js
- Basic folder structure created (public/, src/, config/)
- Package.json configured with necessary scripts
- README.md with setup instructions
- Development environment variables template (.env.example)
**Tech Suggestions:** Node.js 18+, Express.js, nodemon for development

### Ticket 1.2: Create Landing Page Shell
**Background:** Build the static HTML/CSS structure for the single-page application
**Acceptance Criteria:**
- index.html with semantic HTML structure
- Page title "Create trips by chatting with your friends"
- Responsive layout with mobile support
- Placeholder sections for: record button, discussion questions, transcript display, email form
- Basic CSS styling (consider Tailwind CSS via CDN)
**Tech Suggestions:** HTML5, CSS3, optional Tailwind CSS

### Ticket 1.3: Set Up Express Server
**Background:** Create the basic backend server to serve static files and prepare for API endpoints
**Acceptance Criteria:**
- Express server configured and running
- Static file serving from public directory
- Basic error handling middleware
- Health check endpoint (/health)
- Proper CORS configuration
**Tech Suggestions:** Express.js, helmet for security headers, compression middleware

### Ticket 1.4: Configure Development & Deployment Pipeline
**Background:** Establish CI/CD for smooth development and deployment workflow
**Acceptance Criteria:**
- Dockerfile created for containerization
- Basic CI pipeline (GitHub Actions or similar)
- Environment variable management strategy
- Deployment configuration for chosen platform (Heroku/Fly.io)
- Successful deployment of landing page to staging
**Tech Suggestions:** Docker, GitHub Actions, Heroku CLI or Fly.io CLI

## Epic 2: Audio Recording Implementation
**Goal:** Implement browser-based audio recording functionality with proper user feedback

### Ticket 2.1: Implement MediaRecorder Integration
**Background:** Create the core audio recording functionality using the browser's MediaRecorder API
**Acceptance Criteria:**
- JavaScript module for audio recording
- Microphone permission request handling
- Start/stop recording functionality
- Audio data captured in memory as Blob
- Browser compatibility checks with fallback messages
**Tech Suggestions:** MediaRecorder API, getUserMedia, Blob handling

### Ticket 2.2: Build Recording UI Controls
**Background:** Create interactive UI elements for recording control and status display
**Acceptance Criteria:**
- Record button with start/stop states
- Visual recording indicator (pulsing red dot)
- Timer showing elapsed recording time
- Proper button state management
- Accessible keyboard controls
**Tech Suggestions:** Vanilla JS or Alpine.js for reactivity, CSS animations

### Ticket 2.3: Add Recording Error Handling
**Background:** Ensure robust error handling for various recording scenarios
**Acceptance Criteria:**
- Handle microphone permission denial gracefully
- Detect and handle browser incompatibility
- Memory management for long recordings (chunking)
- User-friendly error messages
- Fallback UI states for errors
**Tech Suggestions:** Try-catch blocks, Promise error handling, user notification system

### Ticket 2.4: Implement Audio Upload Functionality
**Background:** Create the client-side logic to upload recorded audio to the backend
**Acceptance Criteria:**
- Convert audio Blob to uploadable format
- Implement file upload with progress indicator
- Handle upload failures with retry logic
- File size validation (client-side)
- Loading state during upload
**Tech Suggestions:** FormData API, fetch with progress, exponential backoff for retries

## Epic 3: Backend Services & API Development
**Goal:** Build robust backend APIs for audio processing and establish external service connections

### Ticket 3.1: Create Transcription API Endpoint
**Background:** Develop the primary endpoint for receiving audio and managing transcription workflow
**Acceptance Criteria:**
- POST /transcribe endpoint accepting multipart form data
- File validation (format, size limits)
- Temporary file storage handling
- Async processing pattern implementation
- JSON response with transcription ID or immediate result
**Tech Suggestions:** Multer for file uploads, uuid for job IDs, temp file cleanup

### Ticket 3.2: Integrate OpenAI Whisper API
**Background:** Connect to OpenAI's Whisper API for speech-to-text conversion
**Acceptance Criteria:**
- OpenAI API client configuration
- Secure API key management
- Audio file submission to Whisper API
- Response parsing and error handling
- Retry logic for API failures
- Cost tracking/logging per request
**Tech Suggestions:** OpenAI Node.js SDK, axios for HTTP calls, environment variables

### Ticket 3.3: Implement Email API Endpoint
**Background:** Create the endpoint for sending transcripts via email
**Acceptance Criteria:**
- POST /email endpoint with email validation
- Request body validation (email, transcript ID/text)
- Rate limiting implementation
- Email formatting logic
- Success/failure response handling
**Tech Suggestions:** express-validator, express-rate-limit

### Ticket 3.4: Set Up Firebase Firestore
**Background:** Configure database for storing transcripts and metadata
**Acceptance Criteria:**
- Firebase project created and configured
- Firestore collections designed (transcripts)
- Service account authentication set up
- Basic CRUD operations implemented
- Connection error handling
**Tech Suggestions:** Firebase Admin SDK, connection pooling

## Epic 4: Transcription Processing & Storage
**Goal:** Implement end-to-end transcription workflow with proper data persistence

### Ticket 4.1: Build Transcription Processing Pipeline
**Background:** Create the complete flow from audio upload to transcript storage
**Acceptance Criteria:**
- Audio received → Whisper API → Store result workflow
- Proper error handling at each step
- Transaction-like behavior (all or nothing)
- Logging for debugging
- Performance metrics collection
**Tech Suggestions:** Async/await patterns, transaction patterns, Winston for logging

### Ticket 4.2: Implement Transcript Storage Logic
**Background:** Save transcripts with proper metadata and retrieval capabilities
**Acceptance Criteria:**
- Transcript document structure defined
- Save transcript with metadata (timestamp, email, duration)
- Unique ID generation for each transcript
- Basic retrieval by ID
- Data validation before storage
**Tech Suggestions:** Firestore document design, ISO date formats, data sanitization

### Ticket 4.3: Add Email Integration with Brevo
**Background:** Integrate Brevo (Sendinblue) API for reliable email delivery
**Acceptance Criteria:**
- Brevo API client configuration
- Email template for transcript delivery
- Plain text and HTML email support
- Attachment handling (optional .txt file)
- Delivery status tracking
- Bounce handling
**Tech Suggestions:** Brevo Node.js SDK, email template engine, MIME types

### Ticket 4.4: Create Status Polling Mechanism
**Background:** Allow frontend to check transcription progress for long-running operations
**Acceptance Criteria:**
- GET /status/:jobId endpoint
- Status states: processing, completed, failed
- Appropriate HTTP status codes
- Timeout handling for stale jobs
- Clean up completed job status after retrieval
**Tech Suggestions:** In-memory cache or Redis for job status, TTL settings

## Epic 5: Frontend Integration & User Experience
**Goal:** Connect all frontend components with backend services and polish the user experience

### Ticket 5.1: Integrate Transcription Display
**Background:** Show transcription results in the UI after processing
**Acceptance Criteria:**
- Fetch transcription result from backend
- Display transcript in scrollable text area
- Loading state during processing
- Error state for failed transcriptions
- Copy-to-clipboard functionality
**Tech Suggestions:** Fetch API, CSS for scrollable areas, Clipboard API

### Ticket 5.2: Implement Email Submission Flow
**Background:** Complete the email delivery user flow
**Acceptance Criteria:**
- Email input field with validation
- Submit button with loading states
- Success/error message display
- Prevent duplicate submissions
- Clear form after successful send
**Tech Suggestions:** HTML5 form validation, debouncing, toast notifications

### Ticket 5.3: Add Discussion Questions Section
**Background:** Implement the discussion prompts feature to guide conversations
**Acceptance Criteria:**
- Static discussion questions display
- Collapsible/expandable section
- Trip planning focused questions initially
- Responsive design for mobile
- Configuration for easy question updates
**Tech Suggestions:** Accordion pattern, JSON configuration file

### Ticket 5.4: Implement Progress Indicators
**Background:** Provide clear feedback during long-running operations
**Acceptance Criteria:**
- Upload progress bar
- "Transcribing..." animation
- Estimated time remaining (if possible)
- Cancel operation option
- Smooth transitions between states
**Tech Suggestions:** CSS animations, progress events, state machine pattern

## Epic 6: Production Readiness & Polish
**Goal:** Ensure the application is production-ready with proper monitoring, security, and polish

### Ticket 6.1: Add Security & Privacy Features
**Background:** Implement security best practices and privacy compliance features
**Acceptance Criteria:**
- HTTPS enforcement
- Input sanitization on all endpoints
- Privacy policy page/modal
- CORS properly configured
- Rate limiting on all endpoints
- Basic CAPTCHA for email sending
**Tech Suggestions:** helmet.js, DOMPurify, reCAPTCHA, express-rate-limit

### Ticket 6.2: Implement Error Tracking & Monitoring
**Background:** Set up proper monitoring for production environment
**Acceptance Criteria:**
- Error tracking service integrated (Sentry or similar)
- Custom error boundaries in frontend
- API performance monitoring
- Uptime monitoring configured
- Alert rules for critical errors
**Tech Suggestions:** Sentry, custom error classes, performance.mark API

### Ticket 6.3: Optimize Performance
**Background:** Ensure fast loading and responsive performance
**Acceptance Criteria:**
- Frontend assets minified
- Lazy loading for non-critical resources
- API response compression
- Database query optimization
- CDN configuration for static assets
**Tech Suggestions:** Webpack/Rollup, gzip compression, CloudFlare

### Ticket 6.4: Cross-Browser Testing & Fixes
**Background:** Ensure compatibility across all target browsers
**Acceptance Criteria:**
- Tested on Chrome, Firefox, Safari, Edge
- Mobile browser testing completed
- Polyfills added where needed
- Browser-specific bugs fixed
- Compatibility matrix documented
**Tech Suggestions:** BrowserStack, feature detection, polyfill.io

### Ticket 6.5: Production Deployment & Documentation
**Background:** Final deployment and comprehensive documentation
**Acceptance Criteria:**
- Production environment configured
- Environment variables secured
- Deployment runbook created
- API documentation complete
- User guide/FAQ created
- Monitoring dashboards configured
**Tech Suggestions:** API documentation tools, deployment checklists

---

These epics and tickets provide a structured approach to building the voice-to-text meeting recorder, with each epic building upon the previous one. The tickets are designed to be small enough for individual developers to complete while maintaining clear dependencies and progression toward the final product.