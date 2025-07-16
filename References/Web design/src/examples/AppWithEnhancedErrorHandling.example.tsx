import { useState } from 'react';
import { Header } from '../components/Header';
import { RecordingSection } from '../components/RecordingSection';
import { QuestionsSection } from '../components/QuestionsSection';
import { EnhancedTranscriptSection } from '../components/EnhancedTranscriptSection';
import { WaitlistForm } from '../components/WaitlistForm';
import { EnhancedNotificationProvider } from '../components/EnhancedErrorNotification';
import { DetailedUploadError } from '../utils/enhancedUploadService';

/**
 * Example App component demonstrating the complete enhanced error handling system
 * for audio uploads with comprehensive recovery options and user-friendly error messages.
 */
function AppWithEnhancedErrorHandling() {
  const [transcript, setTranscript] = useState<string>('');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingMetadata, setRecordingMetadata] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Simulate transcription for demo purposes
  const simulateTranscription = async (blob: Blob, metadata: any) => {
    // In production, this would call your transcription API
    setTimeout(() => {
      setTranscript(`Enhanced error handling demo transcript:

Duration: ${metadata?.totalDuration || 0}ms
Size: ${blob.size} bytes
Type: ${blob.type}

"Let's plan our trip to Japan! We should visit Tokyo, Kyoto, and Osaka. 
We'll need to book flights for next month and find good hotels in each city.
Don't forget to add time for visiting temples and trying local food!"

This transcript was generated for demonstration purposes to show the enhanced 
upload error handling system with detailed error categorization, manual recovery 
options, and user-friendly error messages.`);
    }, 2000);
  };

  const handleRecordingToggle = () => {
    setIsRecording(!isRecording);
  };

  const handleRecordingStateChange = (state: any) => {
    // Handle recording state changes
    console.log('Recording state:', state);
  };

  const handleRecordingComplete = (blob: Blob, metadata: any) => {
    setRecordedAudio(blob);
    setRecordingMetadata(metadata);
    simulateTranscription(blob, metadata);
  };

  const handleUploadSuccess = (response: any) => {
    console.log('Upload successful:', response);
    // Handle successful upload - could redirect to itinerary page
    // or show additional success UI
  };

  const handleUploadError = (error: DetailedUploadError) => {
    console.error('Upload error:', error);
    // Additional error handling if needed
    // The EnhancedTranscriptSection already handles UI error display
  };

  // Example function to simulate different error scenarios for testing
  const simulateError = (errorType: 'network' | 'server' | 'validation' | 'client') => {
    const mockErrors: Record<string, DetailedUploadError> = {
      network: {
        type: 'network_timeout',
        category: 'network',
        message: 'Upload request timed out',
        retryable: true,
        autoRetryable: true,
        manualRetryable: true,
        suggestedAction: 'Check your internet connection and try again',
        userFriendlyMessage: 'The upload timed out. This usually happens with slow internet connections.',
        technicalDetails: 'Network request exceeded timeout limit',
        recoveryOptions: [
          { id: 'retry', label: 'Try Again', description: 'Retry the upload with the same settings', action: 'retry', primary: true },
          { id: 'retry_smaller_chunks', label: 'Use Smaller Chunks', description: 'Retry with smaller file chunks for better reliability', action: 'retry_with_smaller_chunks' },
          { id: 'check_connection', label: 'Check Connection', description: 'Test your internet connection', action: 'check_connection' }
        ]
      },
      server: {
        type: 'server_internal',
        category: 'server',
        message: 'Internal server error',
        statusCode: 500,
        retryable: true,
        autoRetryable: true,
        manualRetryable: true,
        suggestedAction: 'Wait a moment and try again',
        userFriendlyMessage: 'The server encountered an internal error. This is usually temporary.',
        technicalDetails: 'HTTP 500: Internal server error',
        recoveryOptions: [
          { id: 'retry', label: 'Try Again', description: 'Retry the upload after a brief wait', action: 'retry', primary: true },
          { id: 'contact_support', label: 'Contact Support', description: 'Report persistent server errors', action: 'contact_support' }
        ]
      },
      validation: {
        type: 'validation_too_large',
        category: 'validation',
        message: 'File size exceeds maximum allowed size',
        retryable: false,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Record a shorter audio file',
        userFriendlyMessage: 'The audio file exceeds the maximum allowed size.',
        technicalDetails: 'File size validation failed: exceeds size limits',
        recoveryOptions: [
          { id: 'try_different_file', label: 'Record Shorter Audio', description: 'Create a shorter recording', action: 'try_different_file', primary: true },
          { id: 'retry_smaller_chunks', label: 'Try Chunked Upload', description: 'Attempt upload with smaller chunks', action: 'retry_with_smaller_chunks' }
        ]
      },
      client: {
        type: 'client_payload_too_large',
        category: 'client',
        message: 'Request payload too large',
        statusCode: 413,
        retryable: true,
        autoRetryable: false,
        manualRetryable: true,
        suggestedAction: 'Try uploading with smaller chunks or record a shorter audio',
        userFriendlyMessage: 'The audio file is too large for the server to accept.',
        technicalDetails: 'HTTP 413: Request payload exceeds server limits',
        recoveryOptions: [
          { id: 'retry_smaller_chunks', label: 'Use Smaller Chunks', description: 'Break the file into smaller pieces', action: 'retry_with_smaller_chunks', primary: true },
          { id: 'try_different_file', label: 'Record Shorter Audio', description: 'Record a shorter audio file', action: 'try_different_file' }
        ]
      }
    };

    handleUploadError(mockErrors[errorType]);
  };

  return (
    <EnhancedNotificationProvider>
      <div className="min-h-screen bg-cream-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center py-12">
              <h1 className="text-5xl font-bold mb-4">
                Enhanced Error Handling Demo
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Record your travel planning conversations with robust error recovery
              </p>
              
              {/* Development Controls - Remove in production */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                  Development Tools - Test Error Scenarios:
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => simulateError('network')}
                    className="px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded"
                  >
                    Network Error
                  </button>
                  <button
                    onClick={() => simulateError('server')}
                    className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded"
                  >
                    Server Error
                  </button>
                  <button
                    onClick={() => simulateError('validation')}
                    className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
                  >
                    Validation Error
                  </button>
                  <button
                    onClick={() => simulateError('client')}
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
                  >
                    Client Error
                  </button>
                </div>
              </div>
            </section>

            {/* Recording Section */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <RecordingSection
                isRecording={isRecording}
                toggleRecording={handleRecordingToggle}
                onRecordingStateChange={handleRecordingStateChange}
              />
            </section>

            {/* Questions Section */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <QuestionsSection />
            </section>

            {/* Enhanced Transcript Section with Error Handling */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <EnhancedTranscriptSection
                transcript={transcript}
                audioBlob={recordedAudio}
                audioMetadata={recordingMetadata}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </section>

            {/* Error Handling Features Info */}
            <section className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Enhanced Error Handling Features</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Error Categories</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Network errors (timeout, offline, connection)</li>
                    <li>• Server errors (500, 502, 503, 504)</li>
                    <li>• Client errors (400, 401, 403, 413)</li>
                    <li>• Validation errors (corrupted, too large, format)</li>
                    <li>• Session errors (expired, chunks missing)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recovery Options</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Automatic retries with exponential backoff</li>
                    <li>• Manual retry with smaller chunks</li>
                    <li>• Connection testing and troubleshooting</li>
                    <li>• File re-recording suggestions</li>
                    <li>• Contact support integration</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Waitlist Form */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <WaitlistForm />
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-100 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>&copy; 2024 Itinerary Whisperer - Enhanced Error Handling Demo. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </EnhancedNotificationProvider>
  );
}

export default AppWithEnhancedErrorHandling;