// Application State
let isRecording = false;
let recordingStartTime = null;
let recordingInterval = null;

// DOM Elements
const recordButton = document.getElementById('record-button');
const recordText = document.getElementById('record-text');
const recordIcon = document.getElementById('record-icon');
const recordingStatus = document.getElementById('recording-status');
const recordingTime = document.getElementById('recording-time');
const transcriptDisplay = document.getElementById('transcript-display');
const transcriptPlaceholder = document.querySelector('.transcript-placeholder');
const transcriptText = document.getElementById('transcript-text');
const emailForm = document.getElementById('email-form');
const emailInput = document.getElementById('email-input');
const emailSubmit = document.getElementById('email-submit');
const emailStatus = document.getElementById('email-status');

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Itinerary Whisperer - Voice Recording App Initialized');
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI state
    initializeUIState();
}

function setupEventListeners() {
    // Record button click handler
    recordButton.addEventListener('click', handleRecordButtonClick);
    
    // Email form submission handler
    emailForm.addEventListener('submit', handleEmailSubmit);
    
    // Email input validation
    emailInput.addEventListener('input', handleEmailInput);
    emailInput.addEventListener('blur', validateEmailInput);
    
    // Question items interaction
    const questionItems = document.querySelectorAll('.question-item');
    questionItems.forEach(item => {
        item.addEventListener('click', handleQuestionClick);
    });
}

function initializeUIState() {
    // Hide recording status initially
    recordingStatus.classList.add('hidden');
    
    // Show transcript placeholder
    transcriptPlaceholder.classList.remove('hidden');
    transcriptText.classList.add('hidden');
    
    // Clear email status
    emailStatus.classList.add('hidden');
}

// Recording functionality
function handleRecordButtonClick() {
    console.log('Record button clicked');
    
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    console.log('Starting recording...');
    
    isRecording = true;
    recordingStartTime = Date.now();
    
    // Update UI
    updateRecordingUI(true);
    
    // Start recording timer
    startRecordingTimer();
    
    // Show recording status
    recordingStatus.classList.remove('hidden');
    
    // TODO: Implement actual audio recording with MediaRecorder API
    console.log('Recording started - MediaRecorder integration needed');
}

function stopRecording() {
    console.log('Stopping recording...');
    
    isRecording = false;
    recordingStartTime = null;
    
    // Update UI
    updateRecordingUI(false);
    
    // Stop recording timer
    stopRecordingTimer();
    
    // Hide recording status
    recordingStatus.classList.add('hidden');
    
    // Show sample transcript (placeholder)
    showSampleTranscript();
    
    // TODO: Implement actual audio processing and transcription
    console.log('Recording stopped - Audio processing needed');
}

function updateRecordingUI(recording) {
    if (recording) {
        recordButton.classList.add('recording');
        recordText.textContent = 'Stop Recording';
        recordIcon.textContent = '⏹️';
    } else {
        recordButton.classList.remove('recording');
        recordText.textContent = 'Start Recording';
        recordIcon.textContent = '🎙️';
    }
}

function startRecordingTimer() {
    recordingInterval = setInterval(() => {
        if (recordingStartTime) {
            const elapsed = Date.now() - recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function stopRecordingTimer() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    recordingTime.textContent = '00:00';
}

// Transcript functionality
function showSampleTranscript() {
    const sampleText = `[Sample Transcript - Recording completed at ${new Date().toLocaleTimeString()}]

Speaker 1: So we're thinking about planning a trip for next month. Where should we go?

Speaker 2: I've been wanting to visit Japan for a while. The cherry blossom season would be perfect timing.

Speaker 1: That sounds amazing! What's the budget looking like for everyone?

Speaker 2: I'm thinking around $2000-3000 per person for a week-long trip, including flights.

Speaker 1: That works for me. When would be the best dates?

Speaker 2: How about the first week of April? That should be peak cherry blossom season.

[End of sample transcript]`;

    transcriptPlaceholder.classList.add('hidden');
    transcriptText.classList.remove('hidden');
    transcriptText.textContent = sampleText;
    
    console.log('Sample transcript displayed');
}

function clearTranscript() {
    transcriptPlaceholder.classList.remove('hidden');
    transcriptText.classList.add('hidden');
    transcriptText.textContent = '';
}

// Email functionality
function handleEmailSubmit(event) {
    event.preventDefault();
    console.log('Email form submitted');
    
    const email = emailInput.value.trim();
    
    if (!validateEmailAddress(email)) {
        showEmailStatus('Please enter a valid email address.', 'error');
        return;
    }
    
    if (transcriptText.textContent.trim() === '') {
        showEmailStatus('No transcript available to send. Please record a conversation first.', 'error');
        return;
    }
    
    // Simulate email sending
    sendTranscriptEmail(email);
}

function handleEmailInput() {
    // Clear previous error states
    emailStatus.classList.add('hidden');
    emailInput.style.borderColor = '';
}

function validateEmailInput() {
    const email = emailInput.value.trim();
    
    if (email && !validateEmailAddress(email)) {
        emailInput.style.borderColor = '#e53e3e';
        showEmailStatus('Please enter a valid email address.', 'error');
        return false;
    }
    
    emailInput.style.borderColor = '';
    emailStatus.classList.add('hidden');
    return true;
}

function validateEmailAddress(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sendTranscriptEmail(email) {
    console.log(`Sending transcript to: ${email}`);
    
    // Disable submit button during processing
    emailSubmit.disabled = true;
    emailSubmit.textContent = 'Sending...';
    
    // Simulate API call delay
    setTimeout(() => {
        // Re-enable submit button
        emailSubmit.disabled = false;
        emailSubmit.textContent = 'Send Transcript';
        
        // Show success message
        showEmailStatus(`Transcript sent successfully to ${email}!`, 'success');
        
        // Clear form
        emailInput.value = '';
        
        console.log('Email sent successfully (simulated)');
        
        // TODO: Implement actual email sending API call
    }, 2000);
}

function showEmailStatus(message, type) {
    emailStatus.textContent = message;
    emailStatus.className = `email-status ${type}`;
    emailStatus.classList.remove('hidden');
}

// Question interaction
function handleQuestionClick(event) {
    const question = event.target.textContent;
    console.log(`Question clicked: ${question}`);
    
    // Add visual feedback
    event.target.style.backgroundColor = '#e6f3ff';
    setTimeout(() => {
        event.target.style.backgroundColor = '';
    }, 200);
    
    // TODO: Could add functionality to insert question into transcript or recording
}

// Utility functions
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    // Simple toast notification system
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            toast.style.backgroundColor = '#48bb78';
            break;
        case 'error':
            toast.style.backgroundColor = '#e53e3e';
            break;
        default:
            toast.style.backgroundColor = '#4299e1';
    }
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 100);
    
    // Hide and remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
    showToast('An error occurred. Please refresh the page.', 'error');
});

// Export functions for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateEmailAddress,
        formatTime,
        showToast
    };
}