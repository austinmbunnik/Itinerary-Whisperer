# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Itinerary-Whisperer** is a voice-to-text meeting recorder web application designed for group travel planning conversations. The product enables users to record discussions and automatically generate text transcripts, with a focus on facilitating collaborative trip planning. The application operates from a single landing page with no authentication required.

## Core Architecture

### Frontend Structure
- **Technology**: React 18 with TypeScript and Vite
- **Styling**: Tailwind CSS with custom cream-colored theming
- **Components**: Modular React components in `References/Web design/src/components/`
  - `Header.tsx`: Navigation header
  - `RecordingSection.tsx`: Audio recording controls and state
  - `QuestionsSection.tsx`: Discussion prompts for users
  - `TranscriptSection.tsx`: Display area for generated transcripts
  - `WaitlistForm.tsx`: Email capture component

### Backend Architecture (Implemented)
- **Framework**: Node.js 18+ with Express.js (monolithic architecture)
- **Speech-to-Text**: OpenAI Whisper API integration with job queue
- **Email Service**: Brevo (Sendinblue) API for transcript delivery
- **Audio Processing**: FFmpeg integration for format conversion
- **Storage**: File system with automated cleanup
- **Testing**: Jest with comprehensive test coverage
- **Key Endpoints**:
  - `POST /transcribe`: Upload audio and receive job ID
  - `GET /job/:jobId`: Check transcription job status
  - `POST /email`: Send transcript via email
  - `GET /health`: Health check with service status
  - `GET /usage`: Cost and usage analytics

## Development Commands

### Backend Development
```bash
npm start            # Production server (node src/server.js)
npm run dev          # Development with nodemon auto-restart
npm test             # Run Jest test suite
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint code quality checks
npm run format       # Run Prettier code formatting
```

### Frontend Development (Web Design Prototype)
```bash
cd "References/Web design"
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run lint         # Run ESLint and TypeScript checks
npm run preview      # Preview production build
```

### Browser Support Requirements
- Chrome, Firefox, Edge (latest versions)
- Safari 14.1+
- Mobile browsers (iOS Safari, Chrome Android)

## Technical Specifications

### Audio Recording
- **Supported Formats**: WebM, MP3, WAV, M4A, OGG (auto-converted via FFmpeg)
- **Duration**: Up to 60 minutes per recording
- **Size Limit**: 100MB maximum file size
- **API**: MediaRecorder API for browser-based recording
- **Processing**: Asynchronous job-based transcription with status polling

### Performance Targets
- Page load time: < 2 seconds
- Recording start latency: < 1 second
- Transcription turnaround: < 5 minutes for 30-minute audio
- Transcription accuracy: >95% for clear English audio

### Data Flow
1. User clicks record → MediaRecorder captures audio in chunks
2. Recording stops → Audio uploaded to backend via multipart form
3. Backend creates transcription job → Audio processed through FFmpeg if needed
4. Backend sends to Whisper API → Job status updated asynchronously
5. Frontend polls job status → Transcript displayed when completed
6. User can email transcript → Brevo API delivers with rate limiting

## Key Business Requirements

### MVP Scope (Implemented)
- Single-page recording interface without authentication
- Browser-based audio recording via MediaRecorder API
- Automated transcription using OpenAI Whisper API
- Email delivery of transcripts via Brevo
- File system storage with automated cleanup
- Comprehensive error handling and recovery
- Cost tracking and usage monitoring
- Rate limiting and security measures

### Security & Privacy
- HTTPS only with Helmet.js security headers
- Audio files automatically deleted after transcription
- No permanent association between emails and transcripts
- Rate limiting (10 requests/hour per IP for emails)
- CORS configuration for cross-origin security
- Graceful shutdown handling for production

## Development Workflow

### Current Status
The project contains:
- **Backend**: Fully implemented Express.js API with Whisper integration
- **Frontend**: Complete React prototype in `References/Web design/`
- **Services**: Email delivery, cost tracking, audio processing
- **Testing**: Comprehensive Jest test suite with mocking
- **Deployment**: Docker and Heroku configuration
- **Documentation**: Product Requirements Document in `References/PRD.md`

### Key Architecture Components
- `src/server.js`: Main Express application with all endpoints
- `src/services/whisperService.js`: OpenAI API integration with job management  
- `src/services/emailService.js`: Brevo email delivery with rate limiting
- `src/services/costTrackingService.js`: Usage monitoring and budget tracking
- `src/services/audioConverter.js`: FFmpeg audio format conversion
- `tests/`: Comprehensive test coverage for all services
- `config/index.js`: Environment-based configuration management

## GitHub Integration

- **Code Review**: Automated Claude Code Review workflow configured
- **Main Branch**: `main`
- **PR Process**: Claude reviews all pull requests for bugs and security issues

## Cost Considerations & Monitoring

- **Whisper API**: ~$0.18 per 30-minute recording (tracked in real-time)
- **Email Service**: 300 free emails/day with Brevo (rate limited)
- **Target Scale**: 1,000 transcriptions/day initially, scalable to 10,000/day
- **Usage Tracking**: Built-in cost monitoring with daily/monthly summaries
- **Budget Alerts**: Configurable spending thresholds and notifications

## Design Principles to Follow

Law: Aesthetic Usability 	Apply by: Use spacing/typography to make forms feel easier
Law: Hick’s Law 	Apply by: Avoid clutter; collapse complex settings
Law: Jakob’s Law 	Apply by: Stick to familiar WP Admin patterns (cards, sidebars, modals)
Law: Fitts’s Law 	Apply by: Place important buttons close, large, clear
Law: Law of Proximity 	Apply by: Group logic and inputs with spacing + PanelBody + layout components
Law: Zeigarnik Effect 	Apply by: Use progress indicators, save states
Law: Goal-Gradient 	Apply by: Emphasize progress in wizards (e.g. New Rule flow)
Law: Law of Similarity 	Apply by: Ensure toggles, selectors, filters share styling and layout conventions

### Aesthetic-Usability Effect

    Clean, consistent spacing (e.g. gap-2, px-4)
    Typography hierarchy (e.g. headings text-lg font-semibold)
    Visual cues like subtle shadows or border separators improve perceived usability

### Hick's Law

    Reduce visible options per screen
    Collapse complex filters/conditions into toggles or expandable sections

### Jakob’s Law

    Match WordPress admin conventions (e.g. table lists, modals, top bar)
    Stick to familiar placement of "Add New", status toggles, and trash icons

### Fitts’s Law

    Important actions (edit, delete) should be large, clickable buttons
    Avoid tiny icon-only targets unless they are grouped and spaced (space-x-2)

### Law of Proximity

    Group related controls using spacing + containers (e.g. PanelBody, Card)
    Inputs related to conditions or filters should be visually bundled

### Zeigarnik Effect

    Show progress in multi-step rule creation (stepper, breadcrumb, or "Step X of Y")
    Save state feedback (e.g. "Saving..." or "Unsaved changes" banners)

### Goal-Gradient Effect

    Emphasize next step in workflows (highlight active step, primary button styling)
    Use progress bars or steppers to encourage completion

### Law of Similarity

    Use consistent styles for toggle switches, buttons, badges, filters
    Align icon sizing and spacing across all rows for visual rhythm

### Miller's Law

    Don’t overload the user with options; chunk rule configuration into steps/panels
    Default to collapsed sections (e.g. advanced options)

### Doherty Threshold

    Aim for sub-400ms interactions (e.g. loading skeletons, optimistic UI)
    Use loading states with spinners or shimmer placeholders
