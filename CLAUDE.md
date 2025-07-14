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

### Backend Architecture (As Planned)
- **Framework**: Node.js with Express.js (monolithic architecture)
- **Speech-to-Text**: OpenAI Whisper API integration
- **Email Service**: Brevo (Sendinblue) API for transcript delivery
- **Database**: Firebase Firestore for transcript storage
- **Key Endpoints**:
  - `POST /transcribe`: Upload audio and receive transcript
  - `POST /email`: Send transcript via email

## Development Commands

### Frontend Development (Web Design Prototype)
```bash
cd "References/Web design"
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Browser Support Requirements
- Chrome, Firefox, Edge (latest versions)
- Safari 14.1+
- Mobile browsers (iOS Safari, Chrome Android)

## Technical Specifications

### Audio Recording
- **Format**: WebM/Opus codec (preferred) with browser fallbacks
- **Duration**: Up to 60 minutes per recording
- **API**: MediaRecorder API for browser-based recording
- **Processing**: Post-recording transcription (not real-time)

### Performance Targets
- Page load time: < 2 seconds
- Recording start latency: < 1 second
- Transcription turnaround: < 5 minutes for 30-minute audio
- Transcription accuracy: >95% for clear English audio

### Data Flow
1. User clicks record → MediaRecorder captures audio
2. Recording stops → Audio uploaded to backend
3. Backend sends to Whisper API for transcription
4. Transcript displayed on page and stored in Firestore
5. User can email transcript to themselves

## Key Business Requirements

### MVP Scope
- Single-page recording interface without authentication
- Browser-based audio recording via MediaRecorder API
- Automated transcription using OpenAI Whisper
- Email delivery of transcripts
- Basic transcript storage in Firestore
- Comprehensive error handling

### Security & Privacy
- HTTPS only
- Audio files deleted after transcription
- No permanent association between emails and transcripts
- Rate limiting to prevent abuse
- Clear privacy policy requirements

## Development Workflow

### Current Status
The project currently contains:
- Complete React frontend prototype in `References/Web design/`
- Product Requirements Document in `References/PRD.md`
- Planning documentation in `References/`
- GitHub Actions configured for Claude Code Review

### Next Development Steps
1. Implement backend API with Express.js
2. Integrate MediaRecorder API for actual audio capture
3. Connect Whisper API for real transcription
4. Implement email delivery system
5. Set up Firestore for transcript storage
6. Deploy to production environment

## GitHub Integration

- **Code Review**: Automated Claude Code Review workflow configured
- **Main Branch**: `main`
- **PR Process**: Claude reviews all pull requests for bugs and security issues

## Cost Considerations

- **Whisper API**: ~$0.18 per 30-minute recording
- **Email Service**: 300 free emails/day with Brevo
- **Firestore**: 20k writes/day, 1GB storage free tier
- **Target Scale**: 1,000 transcriptions/day initially, scalable to 10,000/day