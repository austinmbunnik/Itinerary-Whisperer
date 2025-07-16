import { useState } from 'react';
import { Header } from '../components/Header';
import { RecordingSection } from '../components/RecordingSection';
import { QuestionsSection } from '../components/QuestionsSection';
import { TranscriptSectionWithUpload } from '../components/TranscriptSectionWithUpload';
import { WaitlistForm } from '../components/WaitlistForm';
import { NotificationProvider } from '../components/ErrorNotification';
import { useRecordingUpload } from '../hooks/useRecordingUpload';

/**
 * Example App component showing how to integrate the recording and upload system
 * with the "Create our itinerary" button functionality.
 */
function AppWithUpload() {
  const [transcript, setTranscript] = useState<string>('');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingMetadata, setRecordingMetadata] = useState<any>(null);
  
  const {
    isRecording,
    isProcessing,
    isUploading,
    uploadProgress,
    startRecording,
    stopRecording,
    processAndPrepareAudio,
    uploadAudio,
    cancelUpload,
    error
  } = useRecordingUpload({
    uploadEndpoint: process.env.REACT_APP_API_URL || '/api/transcribe',
    autoUpload: false, // Manual upload via "Create our itinerary" button
    onRecordingComplete: (blob, metadata) => {
      setRecordedAudio(blob);
      setRecordingMetadata(metadata);
      // In a real app, you would transcribe the audio here
      simulateTranscription(blob);
    },
    onUploadComplete: (response) => {
      console.log('Upload completed:', response);
      // Handle the server response, e.g., redirect to itinerary page
    },
    onError: (error) => {
      console.error('Recording/Upload error:', error);
    }
  });

  // Simulate transcription for demo purposes
  const simulateTranscription = async (blob: Blob) => {
    // In production, this would call your transcription API
    setTimeout(() => {
      setTranscript(`Sample transcript from recording...
Duration: ${recordingMetadata?.totalDuration || 0}ms
Size: ${blob.size} bytes
Type: ${blob.type}

"Let's plan our trip to Japan! We should visit Tokyo, Kyoto, and Osaka. 
We'll need to book flights for next month and find good hotels in each city.
Don't forget to add time for visiting temples and trying local food!"`);
    }, 2000);
  };

  const handleRecordingToggle = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        // Process audio immediately after recording
        try {
          await processAndPrepareAudio(audioBlob);
        } catch (error) {
          console.error('Failed to process audio:', error);
        }
      }
    } else {
      await startRecording();
    }
  };

  const handleCreateItinerary = async () => {
    if (!recordedAudio) return;
    
    try {
      const processed = await processAndPrepareAudio(recordedAudio);
      await uploadAudio(processed, {
        transcript: transcript.substring(0, 1000), // Include transcript preview
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to create itinerary:', error);
    }
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-cream-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center py-12">
              <h1 className="text-5xl font-bold mb-4">
                Voice-to-Text Meeting Recorder
              </h1>
              <p className="text-xl text-gray-600">
                Record your travel planning conversations and get instant transcripts
              </p>
            </section>

            {/* Recording Section with integrated upload state */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <RecordingSection
                isRecording={isRecording}
                toggleRecording={handleRecordingToggle}
                onRecordingStateChange={(state) => {
                  // You can track recording state here if needed
                  console.log('Recording state:', state);
                }}
              />
              
              {/* Show processing/uploading state */}
              {(isProcessing || isUploading) && (
                <div className="mt-4 text-center">
                  {isProcessing && (
                    <p className="text-sm text-gray-600">Processing audio...</p>
                  )}
                  {isUploading && uploadProgress && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Uploading: {uploadProgress.percentage}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-black h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </section>

            {/* Questions Section */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <QuestionsSection />
            </section>

            {/* Transcript Section with Upload */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <TranscriptSectionWithUpload
                transcript={transcript}
                audioBlob={recordedAudio}
                audioMetadata={recordingMetadata}
              />
            </section>

            {/* Alternative: Manual upload button example */}
            {recordedAudio && !isUploading && (
              <section className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-lg font-semibold mb-4">Manual Upload Control</h3>
                <button
                  onClick={handleCreateItinerary}
                  disabled={isProcessing || isUploading}
                  className="w-full bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
                >
                  {isProcessing ? 'Processing...' : 
                   isUploading ? `Uploading ${uploadProgress?.percentage || 0}%` : 
                   'Upload Recording'}
                </button>
                {isUploading && (
                  <button
                    onClick={cancelUpload}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  >
                    Cancel Upload
                  </button>
                )}
              </section>
            )}

            {/* Waitlist Form */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <WaitlistForm />
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-100 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>&copy; 2024 Itinerary Whisperer. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </NotificationProvider>
  );
}

export default AppWithUpload;