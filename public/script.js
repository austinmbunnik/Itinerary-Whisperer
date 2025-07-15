// Application State
let isRecording = false;
let recordingComplete = false;

// DOM Elements
const recordButton = document.getElementById('record-button');
const recordIcon = document.getElementById('record-icon');
const recordingText = document.getElementById('recording-text');
const transcriptSection = document.getElementById('transcript-section');
const transcriptText = document.getElementById('transcript-text');

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Itinerary Whisperer - Voice Recording App Initialized');
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Record button click handler
    recordButton.addEventListener('click', toggleRecording);
}

function toggleRecording() {
    if (isRecording) {
        // Stop recording
        stopRecording();
    } else {
        // Start recording
        startRecording();
    }
}

function startRecording() {
    console.log('Starting recording...');
    
    isRecording = true;
    recordingComplete = false;
    
    // Update UI
    recordButton.classList.add('recording');
    recordingText.innerHTML = '<span class="recording">Recording... Click to stop</span>';
    
    // Hide transcript section when starting new recording
    transcriptSection.classList.add('hidden');
    transcriptText.textContent = '';
    
    // TODO: Implement actual audio recording with MediaRecorder API
    console.log('Recording started - MediaRecorder integration needed');
}

function stopRecording() {
    console.log('Stopping recording...');
    
    isRecording = false;
    recordingComplete = true;
    
    // Update UI
    recordButton.classList.remove('recording');
    recordingText.textContent = 'Click to start recording your conversation';
    
    // Simulate transcript generation (in real app, this would come from transcription)
    const sampleTranscript = `User 1: I think we should visit Paris first, then head to Rome.

User 2: That sounds great! How many days should we spend in each city?

User 1: Maybe 3 days in Paris and 4 in Rome?

User 2: Perfect. What about accommodations? Should we look for hotels or Airbnbs?

User 1: Let's do a mix. Hotel in Paris and maybe an Airbnb in Rome for a more local experience.`;
    
    // Show transcript section with generated transcript
    showTranscript(sampleTranscript);
    
    // TODO: Implement actual audio processing and transcription
    console.log('Recording stopped - Audio processing needed');
}

function showTranscript(transcript) {
    transcriptSection.classList.remove('hidden');
    transcriptText.textContent = transcript;
}

// Export button functionality (placeholder)
document.addEventListener('click', function(e) {
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('Export')) {
        console.log('Export button clicked - functionality to be implemented');
        alert('Export functionality coming soon!');
    }
    
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('Generate Itinerary')) {
        console.log('Generate Itinerary button clicked - functionality to be implemented');
        alert('Itinerary generation coming soon!');
    }
});

// Error handling
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
});