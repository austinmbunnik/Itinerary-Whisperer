# Frontend-Backend Integration Testing Checklist

## Prerequisites
- [ ] Backend server is running (`npm start` or `node src/server.js`)
- [ ] Frontend is accessible (served from backend or separate dev server)
- [ ] OPENAI_API_KEY is configured in .env file
- [ ] Browser developer console is open for monitoring logs

## End-to-End Recording and Transcription Flow

### 1. Initial Page Load
- [ ] Page loads without errors
- [ ] Microphone permission prompt appears (first visit)
- [ ] Recording button displays "Start Recording"
- [ ] Console shows: "✅ Application initialized successfully"

### 2. Start Recording
- [ ] Click "Start Recording" button
- [ ] Recording timer starts counting (MM:SS format)
- [ ] Audio level meter shows visual feedback when speaking
- [ ] Recording button changes to red "Stop Recording" state
- [ ] Pause and Stop buttons appear below
- [ ] Console shows: "🎤 Recording started"

### 3. During Recording
- [ ] Speak for at least 10-15 seconds to create meaningful content
- [ ] Timer continues incrementing
- [ ] Audio level meter responds to voice input
- [ ] Test pause/resume functionality:
  - [ ] Click Pause - timer stops, button changes to "Resume"
  - [ ] Click Resume - timer continues, button changes back to "Pause"

### 4. Stop Recording
- [ ] Click "Stop Recording" button
- [ ] Recording controls disappear
- [ ] "Show us our itinerary" button appears
- [ ] Console shows: "⏹️ Recording stopped" and "✅ Recording completed"

### 5. Upload and Transcription
- [ ] Click "Show us our itinerary" button
- [ ] UI shows "Processing your recording... This may take a few moments."
- [ ] Console shows:
  - [ ] "📤 Uploading audio to transcription API..."
  - [ ] "📥 Upload response: {success: true, jobId: ...}"
  - [ ] "✅ Upload successful. Job ID: [uuid]"
  - [ ] "🔄 Starting job status polling for: [uuid]"

### 6. Job Status Polling
- [ ] UI updates through states:
  - [ ] "Waiting for transcription to start..."
  - [ ] "Transcribing your conversation... Please wait."
- [ ] Console shows periodic status checks:
  - [ ] "🔍 Checking job status: [uuid]"
  - [ ] "📊 Job status: {status: 'processing'...}"

### 7. Successful Transcription
- [ ] UI shows "Transcription complete! Click below to view your itinerary."
- [ ] Console shows:
  - [ ] "✅ Transcription completed successfully"
  - [ ] "💰 Transcription cost: {amount: ...}" (if cost tracking enabled)
- [ ] Transcript section appears with actual transcribed text
- [ ] Page smoothly scrolls to transcript
- [ ] Recording button reappears as "Start New Recording"

## Error Scenarios Testing

### Network Errors
- [ ] Disable network during upload
  - [ ] Error message appears: "Failed to process recording: [error]"
  - [ ] UI resets to initial state
  - [ ] Can retry recording

### Server Errors
- [ ] Stop backend server and try to upload
  - [ ] Error handling shows user-friendly message
  - [ ] No infinite polling

### File Size Limits
- [ ] Record for several minutes (test 100MB limit)
  - [ ] If exceeded, proper error message appears

### API Failures
- [ ] Test with invalid OPENAI_API_KEY
  - [ ] Job fails with appropriate error message
  - [ ] UI shows transcription failure

### Timeout Handling
- [ ] If transcription takes > 3 minutes
  - [ ] Polling stops with timeout message
  - [ ] UI allows retry

## Browser Compatibility

### Chrome (Latest)
- [ ] All features work correctly
- [ ] Audio recording quality is good

### Firefox (Latest)
- [ ] MediaRecorder compatibility
- [ ] UI animations work properly

### Safari (14.1+)
- [ ] Test audio format compatibility
- [ ] Verify permission handling

### Mobile Browsers
- [ ] iOS Safari - recording works
- [ ] Chrome Android - recording works
- [ ] UI is responsive on mobile

## Accessibility Testing
- [ ] Keyboard navigation (R to record, P to pause, Esc to stop)
- [ ] Screen reader announcements work
- [ ] Focus management during state changes
- [ ] High contrast mode visibility

## Performance Monitoring
- [ ] Page loads in < 2 seconds
- [ ] Recording starts within 1 second
- [ ] No memory leaks during long recordings
- [ ] Smooth UI transitions

## Console Log Verification
Ensure these key logs appear during normal flow:
```
✅ Application initialized successfully
🎤 Recording started
⏹️ Recording stopped
✅ Recording completed
📤 Uploading audio to transcription API...
✅ Upload successful. Job ID: [uuid]
🔄 Starting job status polling for: [uuid]
🔍 Checking job status: [uuid]
✅ Transcription completed successfully
📋 Showing itinerary...
```

## Security Checks
- [ ] HTTPS only (no mixed content warnings)
- [ ] No API keys exposed in browser
- [ ] No sensitive data in console logs

## Cleanup Verification
- [ ] Multiple recordings work sequentially
- [ ] Previous job polling stops when starting new recording
- [ ] Memory is properly released between recordings
- [ ] Temp files are cleaned up on backend

## Notes for Testers
- Always check browser console for errors
- Test with various audio input levels
- Try different recording durations (short, medium, long)
- Verify UI remains responsive during all operations
- Document any unexpected behavior with console logs