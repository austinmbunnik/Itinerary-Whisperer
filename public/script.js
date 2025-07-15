// Audio Recorder instance
let audioRecorder = null;

// Application State
let isRecording = false;
let recordingComplete = false;
let currentRecordingBlob = null;

// DOM Elements
const recordButton = document.getElementById('record-button');
const recordIcon = document.getElementById('record-icon');
const recordingText = document.getElementById('recording-text');
const transcriptSection = document.getElementById('transcript-section');
const transcriptText = document.getElementById('transcript-text');

// New UI elements
const statusDisplay = document.getElementById('status-display');
const durationDisplay = document.getElementById('duration-display');
const levelMeter = document.getElementById('level-meter');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const errorClose = document.getElementById('error-close');
const controlButtons = document.getElementById('control-buttons');
const pauseButton = document.getElementById('pause-button');
const stopButton = document.getElementById('stop-button');

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('Itinerary Whisperer - Voice Recording App Initialized');
    
    try {
        // Initialize audio recorder
        await initializeAudioRecorder();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showError('Failed to initialize audio recording. Please check your browser compatibility.');
    }
}

async function initializeAudioRecorder() {
    try {
        // Create AudioRecorder instance
        audioRecorder = new AudioRecorder();
        
        // Check browser compatibility first
        const compatibilityReport = audioRecorder.getCompatibilityReport();
        console.log('🔍 Browser Compatibility Report:', compatibilityReport);
        
        if (!audioRecorder.isSupported) {
            const error = audioRecorder.getCompatibilityError();
            throw new Error(error);
        }
        
        // Set up UI integration
        audioRecorder.setupUIIntegration({
            startButton: recordButton,
            stopButton: stopButton,
            pauseButton: pauseButton,
            statusDisplay: statusDisplay,
            durationDisplay: durationDisplay,
            levelMeter: levelMeter
        });
        
        // Set up event handlers
        setupAudioRecorderEvents();
        
        // Initialize the recorder (request permissions)
        await audioRecorder.initialize({
            maxDuration: 3600000, // 1 hour
            chunkInterval: 5000 // 5 seconds
        });
        
        console.log('✅ AudioRecorder initialized successfully');
        hideError();
        
    } catch (error) {
        console.error('❌ AudioRecorder initialization failed:', error);
        
        // Show user-friendly error based on the type
        if (error.message.includes('permission')) {
            showError('Microphone access denied. Please allow microphone access and refresh the page.', 'permission');
        } else if (error.message.includes('supported')) {
            showError(error.message, 'compatibility');
        } else if (error.message.includes('secure')) {
            showError('Audio recording requires a secure connection (HTTPS). Please access this site via HTTPS.', 'security');
        } else {
            showError('Failed to initialize audio recording. Please refresh the page and try again.', 'general');
        }
        
        throw error;
    }
}

function setupAudioRecorderEvents() {
    // Recording start event
    audioRecorder.onRecordingStart = function() {
        console.log('🎤 Recording started');
        isRecording = true;
        recordingComplete = false;
        currentRecordingBlob = null;
        
        // Update UI
        updateRecordingUI(true);
        hideError();
    };
    
    // Recording stop event
    audioRecorder.onRecordingStop = function() {
        console.log('⏹️ Recording stopped');
        isRecording = false;
    };
    
    // Recording complete event
    audioRecorder.onRecordingComplete = function(blob) {
        console.log('✅ Recording completed', {
            size: blob.size,
            duration: blob.duration,
            mimeType: blob.mimeType
        });
        
        recordingComplete = true;
        currentRecordingBlob = blob;
        
        // Update UI
        updateRecordingUI(false);
        
        // Process the recording
        processRecording(blob);
    };
    
    // Recording pause event
    audioRecorder.onRecordingPause = function() {
        console.log('⏸️ Recording paused');
        recordingText.textContent = 'Recording paused - Click Resume to continue';
    };
    
    // Recording resume event
    audioRecorder.onRecordingResume = function() {
        console.log('▶️ Recording resumed');
        recordingText.textContent = 'Recording... Click Stop to finish';
    };
    
    // Error event
    audioRecorder.onError = function(error) {
        console.error('❌ AudioRecorder error:', error);
        isRecording = false;
        recordingComplete = false;
        
        // Update UI
        updateRecordingUI(false);
        
        // Show user-friendly error
        if (error.message.includes('permission')) {
            showError('Microphone access was denied or lost. Please refresh the page and allow microphone access.', 'permission');
        } else if (error.message.includes('in use')) {
            showError('Your microphone is being used by another application. Please close other apps and try again.', 'device');
        } else {
            showError('Recording error: ' + error.message, 'recording');
        }
    };
    
    // Memory warning event
    audioRecorder.onMemoryWarning = function() {
        console.warn('⚠️ Memory usage is high');
        showError('Recording memory usage is high. Consider stopping and starting a new recording.', 'warning');
    };
    
    // Data available event (for debugging)
    audioRecorder.onDataAvailable = function(dataChunk) {
        console.debug('📊 Audio data chunk received:', dataChunk.size, 'bytes');
    };
}

function setupEventListeners() {
    // Record button click handler
    recordButton.addEventListener('click', toggleRecording);
    
    // Control button handlers
    if (pauseButton) {
        pauseButton.addEventListener('click', togglePause);
    }
    
    if (stopButton) {
        stopButton.addEventListener('click', stopRecording);
    }
    
    // Error close button
    if (errorClose) {
        errorClose.addEventListener('click', hideError);
    }
    
    // Page unload cleanup
    window.addEventListener('beforeunload', cleanupRecording);
    
    // Visibility change cleanup (for mobile)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isRecording) {
            console.log('🔄 Page hidden during recording - maintaining recording');
        }
    });
}

async function toggleRecording() {
    if (!audioRecorder) {
        showError('Audio recorder not initialized. Please refresh the page.', 'general');
        return;
    }
    
    try {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    } catch (error) {
        console.error('❌ Failed to toggle recording:', error);
        showError('Failed to start/stop recording: ' + error.message, 'recording');
    }
}

async function startRecording() {
    console.log('🎬 Starting recording...');
    
    try {
        // Start recording with monitoring enabled
        const result = await audioRecorder.startRecording({
            enableMonitoring: true
        });
        
        console.log('✅ Recording started successfully:', result);
        
        // Hide transcript section when starting new recording
        transcriptSection.classList.add('hidden');
        transcriptText.textContent = '';
        
    } catch (error) {
        console.error('❌ Failed to start recording:', error);
        throw error;
    }
}

async function stopRecording() {
    console.log('🛑 Stopping recording...');
    
    try {
        const result = await audioRecorder.stopRecording();
        console.log('✅ Recording stopped successfully:', result);
        
        return result;
    } catch (error) {
        console.error('❌ Failed to stop recording:', error);
        throw error;
    }
}

async function togglePause() {
    if (!audioRecorder) return;
    
    try {
        const currentState = audioRecorder.state;
        
        if (currentState === AudioRecorder.States.RECORDING) {
            await audioRecorder.pauseRecording();
        } else if (currentState === AudioRecorder.States.PAUSED) {
            await audioRecorder.resumeRecording();
        }
    } catch (error) {
        console.error('❌ Failed to toggle pause:', error);
        showError('Failed to pause/resume recording: ' + error.message, 'recording');
    }
}

function updateRecordingUI(recording) {
    if (recording) {
        // Recording state
        recordButton.classList.add('recording', 'bg-red-600', 'hover:bg-red-700');
        recordButton.classList.remove('bg-black', 'hover:bg-gray-800');
        recordingText.textContent = 'Recording... Click Stop to finish';
        
        // Show stop icon
        recordIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M6 18L18 6M6 6l12 12"></path>
        `;
        
        // Show control buttons
        controlButtons.classList.remove('hidden');
        
    } else {
        // Idle state
        recordButton.classList.remove('recording', 'bg-red-600', 'hover:bg-red-700');
        recordButton.classList.add('bg-black', 'hover:bg-gray-800');
        recordingText.textContent = 'Click to start recording your conversation';
        
        // Show microphone icon
        recordIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        `;
        
        // Hide control buttons
        controlButtons.classList.add('hidden');
        
        // Reset duration and level meter
        durationDisplay.textContent = '00:00';
        levelMeter.style.width = '0%';
    }
}

function processRecording(blob) {
    console.log('🔄 Processing recording...', blob);
    
    // Simulate transcript generation (in real app, this would come from transcription API)
    const sampleTranscript = `User 1: I think we should visit Paris first, then head to Rome.

User 2: That sounds great! How many days should we spend in each city?

User 1: Maybe 3 days in Paris and 4 in Rome?

User 2: Perfect. What about accommodations? Should we look for hotels or Airbnbs?

User 1: Let's do a mix. Hotel in Paris and maybe an Airbnb in Rome for a more local experience.`;
    
    // Show transcript section with generated transcript
    showTranscript(sampleTranscript);
    
    // TODO: Implement actual audio processing and transcription
    console.log('🔄 TODO: Send recording to transcription API');
}

function showTranscript(transcript) {
    transcriptSection.classList.remove('hidden');
    transcriptText.textContent = transcript;
}

function showError(message, type = 'general') {
    console.error('🚨 Showing error:', type, message);
    
    errorText.textContent = message;
    errorContainer.classList.remove('hidden');
    
    // Add different styling based on error type
    const errorMessage = document.getElementById('error-message');
    errorMessage.className = 'px-4 py-3 rounded relative';
    
    switch (type) {
        case 'permission':
            errorMessage.classList.add('bg-yellow-100', 'border', 'border-yellow-400', 'text-yellow-700');
            break;
        case 'compatibility':
            errorMessage.classList.add('bg-blue-100', 'border', 'border-blue-400', 'text-blue-700');
            break;
        case 'warning':
            errorMessage.classList.add('bg-orange-100', 'border', 'border-orange-400', 'text-orange-700');
            break;
        default:
            errorMessage.classList.add('bg-red-100', 'border', 'border-red-400', 'text-red-700');
    }
    
    // Auto-hide warnings after 10 seconds
    if (type === 'warning') {
        setTimeout(hideError, 10000);
    }
}

function hideError() {
    errorContainer.classList.add('hidden');
}

function cleanupRecording() {
    console.log('🧹 Cleaning up recording resources...');
    
    if (audioRecorder) {
        try {
            audioRecorder.cleanup();
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// Export button functionality
document.addEventListener('click', function(e) {
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('Export')) {
        console.log('📤 Export button clicked');
        
        if (currentRecordingBlob) {
            try {
                audioRecorder.downloadRecording('itinerary-discussion.webm');
            } catch (error) {
                console.error('❌ Export failed:', error);
                showError('Failed to export recording: ' + error.message, 'general');
            }
        } else {
            showError('No recording available to export. Please record a conversation first.', 'general');
        }
    }
    
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('Generate Itinerary')) {
        console.log('🗺️ Generate Itinerary button clicked');
        alert('Itinerary generation coming soon!');
    }
});

// Enhanced error handling
window.addEventListener('error', function(event) {
    console.error('🚨 Application error:', event.error);
    showError('An unexpected error occurred. Please refresh the page.', 'general');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred. Please refresh the page.', 'general');
});

// Debug helpers (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.audioRecorder = audioRecorder;
    window.debugRecording = {
        getState: () => audioRecorder?.getState(),
        getCompatibility: () => audioRecorder?.getCompatibilityReport(),
        getCurrentBlob: () => currentRecordingBlob
    };
    console.log('🔧 Debug helpers available: window.debugRecording');
}