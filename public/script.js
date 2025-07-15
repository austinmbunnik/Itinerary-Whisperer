// Audio Recorder instance
let audioRecorder = null;

// Recording Timer instance
let recordingTimer = null;

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
const buttonText = document.getElementById('button-text');
const showItineraryButton = document.getElementById('show-itinerary-button');
const ariaLiveStatus = document.getElementById('aria-live-status');
const keyboardHelp = document.getElementById('keyboard-help');

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Helper function to announce status changes to screen readers
function announceToScreenReader(message) {
    if (ariaLiveStatus) {
        ariaLiveStatus.textContent = message;
        // Clear after announcement to prepare for next message
        setTimeout(() => {
            ariaLiveStatus.textContent = '';
        }, 1000);
    }
}

// Helper function to get display text for recorder state
function getStateDisplayText(state) {
    if (!window.AudioRecorder) return state;
    
    const stateTexts = {
        [AudioRecorder.States.IDLE]: 'Not initialized',
        [AudioRecorder.States.INITIALIZING]: 'Initializing...',
        [AudioRecorder.States.READY]: 'Ready to record',
        [AudioRecorder.States.RECORDING]: 'Recording in progress',
        [AudioRecorder.States.PAUSED]: 'Recording paused',
        [AudioRecorder.States.STOPPING]: 'Stopping...',
        [AudioRecorder.States.ERROR]: 'Error'
    };
    
    return stateTexts[state] || state;
}

async function initializeApp() {
    console.log('Itinerary Whisperer - Voice Recording App Initialized');
    
    try {
        // Initialize recording timer
        recordingTimer = new RecordingTimer();
        recordingTimer.setMaxTimeCallback(() => {
            console.log('⏰ Max recording time reached');
            stopRecording();
            showError('Maximum recording time (1 hour) reached. Recording has been stopped.', 'warning');
        });
        
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
        
        // Set up event handlers before initialization
        setupAudioRecorderEvents();
        
        // Initialize the recorder (request permissions)
        await audioRecorder.initialize({
            maxDuration: 3600000, // 1 hour
            chunkInterval: 5000 // 5 seconds
        });
        
        console.log('✅ AudioRecorder initialized successfully');
        hideError();
        
        // Update initial UI state
        updateRecordingUI(false);
        
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
        
        // Start the timer
        recordingTimer.start(durationDisplay);
        
        // Update UI
        updateRecordingUI(true);
        hideError();
    };
    
    // Recording stop event
    audioRecorder.onRecordingStop = function() {
        console.log('⏹️ Recording stopped');
        isRecording = false;
        
        // Stop the timer
        recordingTimer.stop();
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
        recordingTimer.pause();
        recordingText.textContent = 'Recording paused - Click Resume to continue';
        pauseButton.textContent = 'Resume';
        pauseButton.setAttribute('aria-label', 'Resume recording');
        announceToScreenReader('Recording paused. Press P to resume.');
    };
    
    // Recording resume event
    audioRecorder.onRecordingResume = function() {
        console.log('▶️ Recording resumed');
        recordingTimer.resume();
        recordingText.textContent = 'Recording... Click Stop to finish';
        pauseButton.textContent = 'Pause';
        pauseButton.setAttribute('aria-label', 'Pause recording');
        announceToScreenReader('Recording resumed.');
    };
    
    // Error event
    audioRecorder.onError = function(error) {
        console.error('❌ AudioRecorder error:', error);
        isRecording = false;
        recordingComplete = false;
        
        // Stop the timer on error
        if (recordingTimer) {
            recordingTimer.stop();
        }
        
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
        
        // Announce error to screen readers
        announceToScreenReader(`Recording error: ${error.message}`);
    };
    
    // Memory warning event
    audioRecorder.onMemoryWarning = function() {
        console.warn('⚠️ Memory usage is high');
        showError('Recording memory usage is high. Consider stopping and starting a new recording.', 'warning');
        announceToScreenReader('Memory usage is high. Consider stopping and starting a new recording.');
    };
    
    // Data available event (for debugging)
    audioRecorder.onDataAvailable = function(dataChunk) {
        console.debug('📊 Audio data chunk received:', dataChunk.size, 'bytes');
    };
    
    // Audio level monitoring
    audioRecorder.onAudioLevel = function(level) {
        if (levelMeter) {
            levelMeter.style.width = `${level}%`;
            levelMeter.className = `bg-turquoise h-2 rounded-full transition-all duration-150 ${level > 80 ? 'level-high' : level > 40 ? 'level-medium' : 'level-low'}`;
        }
    };
    
    // Duration update handler
    audioRecorder.onDurationUpdate = function(duration) {
        // Timer handles duration display, but we can use this for other UI updates
        if (duration > 3540) { // 59 minutes - warn about approaching limit
            announceToScreenReader('Recording approaching maximum duration.');
        }
    };
    
    // State change handler
    audioRecorder.onStateChange = function(newState, oldState) {
        console.log(`🔄 AudioRecorder state changed: ${oldState} → ${newState}`);
        
        // Update button states based on recorder state
        if (pauseButton) {
            pauseButton.disabled = newState !== AudioRecorder.States.RECORDING && 
                                  newState !== AudioRecorder.States.PAUSED;
        }
        
        if (stopButton) {
            stopButton.disabled = newState !== AudioRecorder.States.RECORDING && 
                                 newState !== AudioRecorder.States.PAUSED;
        }
        
        // Update status display
        if (statusDisplay) {
            statusDisplay.textContent = getStateDisplayText(newState);
        }
    };
}

function setupEventListeners() {
    // Record button handlers (click and keyboard)
    recordButton.addEventListener('click', toggleRecording);
    recordButton.addEventListener('keydown', function(e) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            toggleRecording();
        }
    });
    
    // Show itinerary button handler
    if (showItineraryButton) {
        showItineraryButton.addEventListener('click', showItinerary);
        showItineraryButton.addEventListener('keydown', function(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                showItinerary();
            }
        });
    }
    
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
    
    // Global keyboard shortcuts (only when not focused on interactive elements)
    document.addEventListener('keydown', function(e) {
        // Check if user is typing in an input field or focused on a button
        const isTyping = e.target.matches('input, textarea, select');
        const isOnButton = e.target.matches('button, [role="button"]');
        
        // Prevent shortcuts when typing or when a button is focused
        if (isTyping || isOnButton) {
            return;
        }
        
        // R key to start/stop recording (safer than spacebar for global shortcuts)
        if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            toggleRecording();
            announceToScreenReader(isRecording ? 'Recording stopped' : 'Recording started');
        }
        
        // P key to pause/resume during recording
        if (e.code === 'KeyP' && isRecording && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            togglePause();
        }
        
        // Escape to stop recording
        if (e.code === 'Escape' && isRecording) {
            e.preventDefault();
            stopRecording();
            announceToScreenReader('Recording stopped');
        }
        
        // ? key to toggle keyboard help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (keyboardHelp) {
                keyboardHelp.classList.toggle('hidden');
                announceToScreenReader(keyboardHelp.classList.contains('hidden') ? 
                    'Keyboard help closed' : 'Keyboard help opened');
            }
        }
    });
}

async function toggleRecording() {
    if (!audioRecorder) {
        showError('Audio recorder not initialized. Please refresh the page.', 'general');
        return;
    }
    
    try {
        if (audioRecorder.state === AudioRecorder.States.RECORDING) {
            await stopRecording();
        } else if (audioRecorder.state === AudioRecorder.States.PAUSED) {
            await resumeRecording();
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
        // Reset recording state for new recording
        recordingComplete = false;
        currentRecordingBlob = null;
        
        // Start recording with monitoring enabled
        const result = await audioRecorder.startRecording({
            enableMonitoring: true,
            timeslice: 1000 // 1 second chunks for better responsiveness
        });
        
        console.log('✅ Recording started successfully:', result);
        
        // Hide transcript section when starting new recording
        transcriptSection.classList.add('hidden');
        transcriptSection.classList.remove('show');
        transcriptText.textContent = '';
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to start recording:', error);
        throw error;
    }
}

async function stopRecording() {
    console.log('🛑 Stopping recording...');
    
    try {
        // Ensure timer is stopped immediately
        if (recordingTimer) {
            recordingTimer.stop();
        }
        
        const result = await audioRecorder.stopRecording({
            reason: 'user_action'
        });
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
            const result = await audioRecorder.pauseRecording();
            console.log('⏸️ Recording paused:', result);
        } else if (currentState === AudioRecorder.States.PAUSED) {
            const result = await audioRecorder.resumeRecording();
            console.log('▶️ Recording resumed:', result);
        }
    } catch (error) {
        console.error('❌ Failed to toggle pause:', error);
        showError('Failed to pause/resume recording: ' + error.message, 'recording');
    }
}

async function resumeRecording() {
    if (!audioRecorder) return;
    
    try {
        const result = await audioRecorder.resumeRecording();
        console.log('▶️ Recording resumed:', result);
        return result;
    } catch (error) {
        console.error('❌ Failed to resume recording:', error);
        throw error;
    }
}

function updateRecordingUI(recording) {
    if (recording) {
        // Recording state
        recordButton.classList.remove('hidden');
        buttonText.classList.remove('hidden');
        showItineraryButton.classList.add('hidden');
        
        recordButton.className = 'w-24 h-24 rounded-full flex items-center justify-center mb-4 cursor-pointer recording focus:outline-none focus:ring-4 focus:ring-coral focus:ring-opacity-50';
        recordButton.setAttribute('data-state', 'recording');
        recordButton.setAttribute('aria-label', 'Stop Recording');
        recordButton.setAttribute('aria-pressed', 'true');
        
        recordingText.textContent = 'Recording... Click Stop to finish';
        
        if (buttonText) {
            buttonText.textContent = 'Stop Recording';
            buttonText.className = 'text-lg font-medium mb-2 recording';
        }
        
        // Show control buttons
        controlButtons.classList.remove('hidden');
        
        // Update status
        statusDisplay.textContent = 'Recording in progress';
        
        // Announce to screen readers
        announceToScreenReader('Recording started. Press Space or Enter to stop, P to pause, or Escape to cancel.');
        
    } else {
        // Check if recording was completed
        if (recordingComplete && currentRecordingBlob) {
            // Stopped state - Hide recording button and show itinerary button
            recordButton.classList.add('hidden');
            buttonText.classList.add('hidden');
            
            // Show the itinerary button with animation and focus it
            showItineraryButton.classList.remove('hidden');
            setTimeout(() => {
                showItineraryButton.focus();
            }, 100);
            
            // Update recording text for completed state
            recordingText.textContent = 'Recording completed successfully!';
            
            statusDisplay.textContent = 'Recording complete - Total time: ' + recordingTimer.getFormattedTime();
            
            // Announce completion
            announceToScreenReader(`Recording completed. Total time: ${recordingTimer.getFormattedTime()}. Press Enter to show your itinerary.`);
        } else {
            // Idle state
            recordButton.classList.remove('hidden');
            recordButton.className = 'w-24 h-24 rounded-full flex items-center justify-center mb-4 bg-plum hover:bg-berry cursor-pointer transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-berry focus:ring-opacity-50';
            recordButton.setAttribute('data-state', 'idle');
            recordButton.setAttribute('aria-label', 'Start Recording');
            recordButton.setAttribute('aria-pressed', 'false');
            
            recordingText.textContent = 'Click to start recording your conversation';
            
            if (buttonText) {
                buttonText.classList.remove('hidden');
                buttonText.textContent = 'Start Recording';
                buttonText.className = 'text-lg font-medium mb-2';
            }
            
            // Ensure itinerary button is hidden
            showItineraryButton.classList.add('hidden');
            
            statusDisplay.textContent = 'Ready to record';
            
            // Reset timer display
            if (!recordingComplete) {
                recordingTimer.reset();
            }
            
            // Announce ready state
            announceToScreenReader('Ready to record. Press Space or Enter to start recording.');
        }
        
        // Hide control buttons
        controlButtons.classList.add('hidden');
        
        // Reset level meter
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
    
    // Store the transcript but don't show it yet
    transcriptText.textContent = sampleTranscript;
    
    // TODO: Implement actual audio processing and transcription
    console.log('🔄 TODO: Send recording to transcription API');
}

function showTranscript(transcript) {
    transcriptSection.classList.remove('hidden');
    transcriptText.textContent = transcript;
}

function showItinerary() {
    console.log('📋 Showing itinerary...');
    
    // Hide the itinerary button with animation
    showItineraryButton.style.animation = 'fadeOutScale 0.3s ease-out forwards';
    
    setTimeout(() => {
        // Hide the itinerary button
        showItineraryButton.classList.add('hidden');
        
        // Show the recording button and text again for new recording
        recordButton.classList.remove('hidden');
        buttonText.classList.remove('hidden');
        
        // Reset recording button to idle state
        recordButton.className = 'w-24 h-24 rounded-full flex items-center justify-center mb-4 bg-plum hover:bg-berry cursor-pointer transition-all duration-300';
        recordButton.setAttribute('data-state', 'idle');
        recordButton.setAttribute('aria-label', 'Start New Recording');
        
        buttonText.textContent = 'Start New Recording';
        buttonText.className = 'text-lg font-medium mb-2';
        
        recordingText.textContent = 'Ready to record another conversation';
        
        // Reset the recording state
        recordingComplete = false;
        currentRecordingBlob = null;
        recordingTimer.reset();
        
        // Show transcript section with animation
        transcriptSection.classList.remove('hidden');
        transcriptSection.setAttribute('tabindex', '-1'); // Make it focusable
        
        // Trigger reflow to ensure animation plays
        void transcriptSection.offsetWidth;
        
        // Add show class for animation
        transcriptSection.classList.add('show');
        
        // Smooth scroll to transcript section and focus it
        setTimeout(() => {
            transcriptSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
            transcriptSection.focus();
            announceToScreenReader('Transcript displayed. Your conversation transcript is now visible below.');
        }, 100);
        
    }, 300);
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
    
    if (recordingTimer) {
        try {
            recordingTimer.cleanup();
        } catch (error) {
            console.error('❌ Error during timer cleanup:', error);
        }
    }
    
    // Reset UI state
    isRecording = false;
    recordingComplete = false;
    currentRecordingBlob = null;
}

// Export button functionality
document.addEventListener('click', function(e) {
    if (e.target.closest('button') && e.target.closest('button').textContent.includes('Export')) {
        console.log('📤 Export button clicked');
        
        if (audioRecorder && audioRecorder.currentBlob) {
            try {
                const timestamp = new Date().toISOString().slice(0, 10);
                const filename = `itinerary-discussion-${timestamp}.webm`;
                audioRecorder.downloadRecording(filename);
                announceToScreenReader('Recording downloaded successfully.');
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
        announceToScreenReader('Itinerary generation feature coming soon.');
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