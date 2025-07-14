# Product Requirements Document: Voice-to-Text Meeting Recorder

## 1. Executive Summary

This PRD outlines the development of a streamlined web application that enables users to record conversations and automatically generate text transcripts. While inspired by Fireflies.ai's functionality, this product focuses on a specific use case: facilitating group discussions for collaborative planning (initially positioned for trip planning conversations). The application requires no authentication, operates entirely from a single landing page, and delivers transcripts via email.

## 2. Product Overview

### 2.1 Vision Statement
Create a frictionless, one-click solution for capturing and transcribing group discussions, enabling users to focus on their conversation while automatically documenting key decisions and ideas.

### 2.2 Target Users
- Groups planning trips or events together
- Teams conducting informal brainstorming sessions
- Anyone needing quick conversation transcription without complex setup

### 2.3 Core Value Propositions
- Zero-friction access (no sign-up required)
- Single-page functionality
- Immediate transcript delivery via email
- Discussion prompts to enhance conversation quality

## 3. Functional Requirements

### 3.1 Landing Page
- **Title**: "Create trips by chatting with your friends"
- **Primary CTA**: Prominent "Record" button
- **Discussion Questions Section**: 
  - Display area for conversation prompts
  - Initially populated with travel-planning focused questions
  - Configurable for future iterations
- **Status Indicators**:
  - Recording timer/elapsed time
  - Visual feedback for recording state
  - Processing status ("Transcribing...")

### 3.2 Recording Functionality
- **Audio Capture**:
  - One-click microphone access request
  - Support for recordings up to 60 minutes
  - Visual recording indicator with elapsed time
  - Stop recording button
- **Browser Support**:
  - Chrome, Firefox, Edge (latest versions)
  - Safari 14.1+
  - Mobile browsers (iOS Safari, Chrome Android)
- **Audio Format**:
  - WebM/Opus codec (preferred for size efficiency)
  - Fallback to supported formats per browser

### 3.3 Transcription
- **Processing**:
  - Automatic transcription upon recording completion
  - Post-recording processing (not real-time)
  - Expected processing time: 1-3 minutes for 30-minute recording
- **Accuracy Target**: 95%+ for clear English audio
- **Display**:
  - Scrollable text area on the same page
  - Clear formatting with timestamps (future enhancement)

### 3.4 Email Delivery
- **Functionality**:
  - Email input field with validation
  - "Send Transcript" button
  - Success/failure confirmation
- **Email Content**:
  - Plain text transcript in email body
  - Optional .txt file attachment
  - Clear subject line: "Your [Date] Discussion Transcript"
- **Security**:
  - Basic email validation
  - Rate limiting to prevent abuse
  - No authentication required

### 3.5 Data Storage
- **Transcript Storage**:
  - All transcripts stored permanently (with future GDPR compliance)
  - Searchable by email or timestamp
  - No audio file storage
- **Metadata**:
  - Recording timestamp
  - Email address (if provided)
  - Transcript length
  - Unique session ID

## 4. Non-Functional Requirements

### 4.1 Performance
- Page load time: < 2 seconds
- Recording start latency: < 1 second
- Transcription turnaround: < 5 minutes for 30-minute audio
- Concurrent user support: 50+ simultaneous recordings

### 4.2 Reliability
- 99.5% uptime target
- Graceful error handling with user-friendly messages
- Automatic retry for failed API calls
- Local storage fallback for recording if upload fails

### 4.3 Security & Privacy
- HTTPS only
- Audio files deleted after transcription
- Email addresses not permanently associated with transcripts
- Future GDPR compliance with deletion requests
- Clear privacy policy on landing page

### 4.4 Scalability
- Support for 1,000 transcriptions/day initially
- Ability to scale to 10,000/day with minimal changes
- Cost-effective scaling model

## 5. Technical Architecture

### 5.1 Frontend
- **Technology**: Vanilla JavaScript with minimal dependencies
- **Optional Enhancement**: Alpine.js for reactive UI elements
- **Styling**: CSS with optional Tailwind for rapid development
- **Build Process**: None required (serve static files directly)

### 5.2 Backend
- **Architecture**: Monolithic Node.js application
- **Framework**: Express.js
- **Endpoints**:
  - `POST /transcribe` - Upload audio and receive transcript
  - `POST /email` - Send transcript via email
- **Error Handling**: Comprehensive logging and user-friendly error responses

### 5.3 External Services
- **Speech-to-Text**: OpenAI Whisper API
  - Cost: ~$0.18 per 30-minute recording
  - English-only initially
- **Email**: Brevo (Sendinblue) API
  - Free tier: 300 emails/day
  - Upgrade path available
- **Database**: Firebase Firestore
  - Free tier: 20k writes/day, 1GB storage
  - NoSQL document structure

### 5.4 Deployment
- **Hosting**: Containerized deployment (Docker)
- **Platform**: Heroku, Fly.io, or similar PaaS
- **Static Assets**: Served by Express or CDN

## 6. User Journey

1. User lands on page, sees "Create trips by chatting with your friends"
2. Reviews discussion questions/prompts
3. Clicks "Record" button
4. Grants microphone permission (first time only)
5. Sees recording indicator and timer
6. Conducts discussion with friends
7. Clicks "Stop" button
8. Sees "Transcribing..." status
9. Reviews transcript on page
10. Enters email address
11. Clicks "Send Transcript"
12. Receives confirmation
13. Checks email for transcript

## 7. MVP Scope

### 7.1 Must Have
- Single-page recording interface
- Audio recording via browser
- Automated transcription
- Email delivery
- Basic transcript storage
- Error handling

### 7.2 Nice to Have (Future)
- Real-time transcription display
- Speaker identification
- AI-generated summaries
- Download transcript as PDF
- Multi-language support
- Custom discussion prompts

### 7.3 Out of Scope for MVP
- User accounts/authentication
- Audio file storage
- Editing transcripts
- Sharing transcripts via link
- Integration with calendar/meeting tools
- Mobile native apps

## 8. Success Metrics

### 8.1 Technical Metrics
- Transcription accuracy: >95%
- Processing time: <5 minutes for 30-min audio
- Email delivery rate: >98%
- Error rate: <2%

### 8.2 Usage Metrics
- Daily active recordings
- Average recording length
- Email send rate
- Return user rate (by email)

## 9. Risks & Mitigations

### 9.1 Technical Risks
- **Browser compatibility**: Mitigated by MediaRecorder API widespread support
- **Large file uploads**: Mitigated by streaming uploads and compression
- **API failures**: Mitigated by retry logic and error handling

### 9.2 Business Risks
- **Abuse/spam**: Mitigated by rate limiting and email validation
- **Cost overruns**: Mitigated by usage monitoring and API limits
- **Privacy concerns**: Mitigated by clear policies and data handling

## 10. Future Enhancements

### 10.1 Phase 2 (3-6 months)
- AI-powered discussion suggestions based on conversation flow
- Summary generation using LLM
- Multi-language transcription
- Basic analytics dashboard

### 10.2 Phase 3 (6-12 months)
- Real-time collaborative features
- Integration with planning tools
- Custom branding options
- API for third-party integrations

## 11. Implementation Timeline

### Week 1-2: Foundation
- Set up development environment
- Implement basic HTML/CSS structure
- Integrate MediaRecorder API
- Basic recording functionality

### Week 3-4: Backend Development
- Node.js server setup
- Whisper API integration
- Email service integration
- Basic error handling

### Week 5-6: Integration & Polish
- Connect frontend to backend
- Implement Firestore storage
- Add loading states and error messages
- Email delivery functionality

### Week 7-8: Testing & Deployment
- Cross-browser testing
- Performance optimization
- Deployment setup
- Production monitoring

## 12. Acceptance Criteria

The product will be considered complete for MVP when:
1. Users can record audio from the landing page without sign-up
2. Recordings are automatically transcribed with >90% accuracy
3. Transcripts display on the same page after processing
4. Users can email transcripts to themselves
5. All transcripts are stored in the database
6. The system handles errors gracefully
7. The application works on major browsers
8. Performance meets specified targets

---

This PRD provides a comprehensive guide for building the voice-to-text meeting recorder while maintaining flexibility for implementation details and future iterations. The focus remains on delivering a simple, reliable solution that can be expanded based on user feedback and business needs.