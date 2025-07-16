import { useState, useCallback } from 'react';
import { Header } from './Header';
import { RecordingSection } from './RecordingSection';
import { QuestionsSection } from './QuestionsSection';
import { TravelThemedTranscriptSection } from './TravelThemedTranscriptSection';
import { EnhancedNotificationProvider } from './EnhancedErrorNotification';
import { FloatingRecordingStatus } from './RecordingStatusIndicator';
import { useIntegratedRecording } from '../hooks/useIntegratedRecording';
import { TranscriptionResult } from '../services/transcriptionService';
import { DetailedUploadError } from '../utils/enhancedUploadService';
import { Sparkles, MapPin, Plane } from 'lucide-react';

export function IntegratedApp() {
  const [showTranscriptSection, setShowTranscriptSection] = useState(false);

  const {
    // State
    isRecording,
    recordingState,
    isProcessingAudio,
    isTranscribing,
    transcriptionProgress,
    audioBlob,
    transcriptionResult,
    recordingComplete,
    transcriptionComplete,
    error,
    
    // Actions
    startRecording,
    stopRecording,
    manualTranscribe,
    retryTranscription,
    reset,
    
    // Computed
    transcript,
    travelAnalysis,
    hasAudio,
    isProcessing
  } = useIntegratedRecording({
    autoTranscribe: true, // Automatically transcribe after recording
    enableTravelAnalysis: true,
    onRecordingComplete: (audioBlob, metadata) => {
      console.log('Recording completed:', { size: audioBlob.size, metadata });
      setShowTranscriptSection(true);
    },
    onTranscriptionComplete: (result: TranscriptionResult) => {
      console.log('Transcription completed:', result);
      // The transcript section will automatically show the new content
    },
    onError: (error) => {
      console.error('Recording/Transcription error:', error);
    }
  });

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      // Reset previous session when starting new recording
      if (recordingComplete) {
        reset();
        setShowTranscriptSection(false);
      }
      await startRecording();
    }
  }, [isRecording, recordingComplete, startRecording, stopRecording, reset]);

  const handleUploadSuccess = useCallback((response: any) => {
    console.log('Itinerary upload successful:', response);
    // You could redirect to an itinerary page or show a success message
  }, []);

  const handleUploadError = useCallback((error: DetailedUploadError) => {
    console.error('Itinerary upload failed:', error);
    // Error handling is already done in the TravelThemedTranscriptSection
  }, []);

  const getProcessingMessage = () => {
    if (isProcessingAudio) return 'Processing your audio...';
    if (isTranscribing) return `Transcribing... ${transcriptionProgress}%`;
    return null;
  };

  return (
    <EnhancedNotificationProvider>
      <div className="min-h-screen bg-cream text-black" style={{
        backgroundImage: "url('https://uploadthingy.s3.us-west-1.amazonaws.com/juBMQMJCbUfpPFeN2BnR3Q/image%281%29.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: '#f5f2eb',
        backgroundBlendMode: 'soft-light'
      }}>
        <div className="bg-cream/80 min-h-screen">
          <Header />
          
          <main className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              {/* Hero Section */}
              <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-bold mb-8">
                  The group call notetaker
                  <br />
                  that plans trips
                  <br />
                  <span className="border-b-4 border-black pb-1">for you.</span>
                </h1>
                
                <div className="max-w-2xl mx-auto mb-12">
                  <p className="text-xl mb-2">
                    Generate <strong>instant, bookable</strong> trips,{' '}
                    <strong>tailored</strong> to your group.
                  </p>
                  <p className="text-xl">
                    Just gather your friends, hit record, and start chatting.
                  </p>
                </div>

                {/* Travel Analysis Preview */}
                {travelAnalysis && transcriptionComplete && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 mb-8 max-w-3xl mx-auto">
                    <div className="flex items-center justify-center mb-4">
                      <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-800">Your Travel Plans Detected!</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <MapPin className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                        <div className="font-semibold text-blue-900">{travelAnalysis.destinations.length}</div>
                        <div className="text-gray-600">Destinations</div>
                        {travelAnalysis.destinations.slice(0, 2).map((dest, i) => (
                          <div key={i} className="text-xs text-gray-500 capitalize">{dest}</div>
                        ))}
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border border-purple-200">
                        <Plane className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                        <div className="font-semibold text-purple-900">{travelAnalysis.estimatedDuration}</div>
                        <div className="text-gray-600">Days planned</div>
                        <div className="text-xs text-gray-500 capitalize">{travelAnalysis.complexity} itinerary</div>
                      </div>
                      
                      <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                        <Sparkles className="h-5 w-5 mx-auto mb-2 text-green-600" />
                        <div className="font-semibold text-green-900">{travelAnalysis.activities.length}</div>
                        <div className="text-gray-600">Activities</div>
                        <div className="text-xs text-gray-500 capitalize">{travelAnalysis.travelStyle} style</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recording Section */}
              <div className="mb-16">
                <RecordingSection 
                  isRecording={isRecording} 
                  toggleRecording={handleRecordingToggle}
                  onRecordingStateChange={() => {}} // We handle state in the hook
                />
                
                {/* Processing Status */}
                {isProcessing && (
                  <div className="mt-6 text-center">
                    <div className="bg-white/90 rounded-lg p-4 border border-blue-200 max-w-md mx-auto">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-blue-800 font-medium">{getProcessingMessage()}</span>
                      </div>
                      {isTranscribing && transcriptionProgress > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${transcriptionProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-6 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-red-700">{error}</p>
                      {hasAudio && (
                        <button
                          onClick={retryTranscription}
                          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Retry Transcription
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content Grid */}
              <div className="grid md:grid-cols-2 gap-8 bg-white/80 p-8 rounded-lg backdrop-blur-sm">
                {/* Questions Section */}
                <div>
                  <QuestionsSection />
                </div>

                {/* Transcript Section - Shows after recording starts or completes */}
                <div>
                  {(showTranscriptSection || recordingComplete || transcript) && (
                    <TravelThemedTranscriptSection
                      transcript={transcript}
                      audioBlob={audioBlob}
                      audioMetadata={{
                        ...recordingState,
                        travelAnalysis,
                        transcriptionMetadata: transcriptionResult?.metadata
                      }}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                    />
                  )}
                  
                  {/* Placeholder when no recording yet */}
                  {!showTranscriptSection && !recordingComplete && !transcript && (
                    <div className="text-center py-12 text-gray-500">
                      <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">Ready for your travel conversation</h3>
                      <p className="text-sm">
                        Start recording to see your transcript and create your personalized itinerary!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Transcription Button (if auto-transcription is disabled or failed) */}
              {hasAudio && !isProcessing && !transcriptionComplete && (
                <div className="text-center mt-8">
                  <button
                    onClick={manualTranscribe}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Generate Transcript
                  </button>
                </div>
              )}

              {/* Development Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-16 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Development Status</h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <div>Recording: {isRecording ? '🔴 Active' : '⚪ Idle'}</div>
                    <div>Audio: {hasAudio ? '✅ Available' : '❌ None'}</div>
                    <div>Processing: {isProcessing ? '⏳ Active' : '✅ Complete'}</div>
                    <div>Transcript: {transcriptionComplete ? '✅ Ready' : '❌ Pending'}</div>
                    <div>Travel Analysis: {travelAnalysis ? '✅ Available' : '❌ None'}</div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Floating Recording Status */}
          <FloatingRecordingStatus recordingState={recordingState} />
        </div>
      </div>
    </EnhancedNotificationProvider>
  );
}