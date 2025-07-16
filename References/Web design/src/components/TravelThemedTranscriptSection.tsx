import { useState, useCallback, useRef } from 'react';
import { FileTextIcon, DownloadIcon, MapPin, Sparkles } from 'lucide-react';
import { EnhancedItineraryButton, ProgressDetails, ButtonState } from './EnhancedItineraryButton';
import { enhancedUploadService, DetailedUploadError, UploadProgress } from '../utils/enhancedUploadService';
import { AudioProcessor } from '../utils/audioProcessor';
import { useEnhancedNotifications } from './EnhancedErrorNotification';

interface TravelThemedTranscriptSectionProps {
  transcript: string;
  audioBlob?: Blob;
  audioMetadata?: any;
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: DetailedUploadError) => void;
}

export const TravelThemedTranscriptSection = ({
  transcript,
  audioBlob,
  audioMetadata,
  onUploadSuccess,
  onUploadError
}: TravelThemedTranscriptSectionProps) => {
  const { showUploadError, showSuccess, showInfo, showWarning } = useEnhancedNotifications();
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<DetailedUploadError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const uploadIdRef = useRef<string | null>(null);
  const audioProcessorRef = useRef(new AudioProcessor());

  const handleExport = useCallback(() => {
    if (!transcript) return;
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showInfo('Travel plans exported! 📋', 'Your transcript has been downloaded.');
  }, [transcript, showInfo]);

  const performUpload = useCallback(async (
    options?: { smallerChunks?: boolean; withoutChunks?: boolean }
  ): Promise<any> => {
    if (!audioBlob) {
      throw new Error('No audio available');
    }

    setButtonState('processing');
    setUploadError(null);
    setUploadProgress(null);

    try {
      // Show a fun processing message
      showInfo('🎒 Getting ready...', 'Processing your travel conversation for the perfect itinerary!');

      // Process and validate audio
      const processedAudio = await audioProcessorRef.current.processAudioBlob(audioBlob);
      
      setButtonState('uploading');
      
      // Configure upload with travel-themed metadata
      const uploadConfig = {
        endpoint: process.env.REACT_APP_API_URL || '/api/transcribe',
        enableChunking: options?.withoutChunks ? false : processedAudio.metadata.size > 10 * 1024 * 1024,
        chunkSize: options?.smallerChunks ? 2 * 1024 * 1024 : 5 * 1024 * 1024,
        maxRetries: 3,
        timeout: 300000,
        headers: {
          'X-Client-Version': '1.0.0',
          'X-Travel-Session': `travel_${Date.now()}`,
          'X-Retry-Count': retryCount.toString(),
        },
        metadata: {
          duration: processedAudio.metadata.duration,
          codec: processedAudio.metadata.codec,
          mimeType: processedAudio.metadata.mimeType,
          transcript: transcript.substring(0, 1000),
          retryCount,
          sessionType: 'travel-planning',
          clientTimestamp: new Date().toISOString(),
          travelContext: {
            hasDestinations: transcript.toLowerCase().includes('go to') || transcript.toLowerCase().includes('visit'),
            hasDates: /\b\d{1,2}\/\d{1,2}|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(transcript),
            hasActivities: /\b(restaurant|food|hotel|museum|beach|hiking|tour)\b/i.test(transcript),
            estimatedComplexity: transcript.length > 500 ? 'complex' : transcript.length > 200 ? 'moderate' : 'simple'
          },
          ...audioMetadata
        },
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
        onChunkComplete: (chunkIndex: number, totalChunks: number) => {
          if (totalChunks > 1) {
            showInfo(
              `🗺️ Progress update`,
              `Uploaded travel segment ${chunkIndex} of ${totalChunks}`
            );
          }
        },
        onComplete: (response: any) => {
          setButtonState('success');
          setRetryCount(0);
          
          // Show success with travel-themed message
          showSuccess(
            '🎉 Your itinerary is ready!',
            'Your personalized travel plan is being crafted and will arrive in your inbox shortly!'
          );
          
          onUploadSuccess?.(response);
          
          // Auto-reset button after success celebration
          setTimeout(() => {
            setButtonState('idle');
            setUploadProgress(null);
          }, 5000);
        },
        onError: (error: DetailedUploadError) => {
          console.error('Upload error:', error);
          setButtonState('error');
          setUploadError(error);
          onUploadError?.(error);
          
          // Show travel-themed error message
          const travelErrorMessages: Record<string, string> = {
            'network_timeout': 'Looks like we hit some turbulence! ✈️ Connection timed out.',
            'network_offline': 'No internet connection detected! 📶 Check your connection and try again.',
            'server_internal': 'Our travel servers are taking a quick break! 🛠️ Please try again in a moment.',
            'validation_too_large': 'Your travel story is quite an adventure! 📖 Try a shorter recording.',
            'client_payload_too_large': 'That\'s a lot of travel plans! 🧳 Let\'s break it into smaller chunks.'
          };
          
          const customMessage = travelErrorMessages[error.type] || error.userFriendlyMessage;
          showUploadError({
            ...error,
            userFriendlyMessage: customMessage
          }, handleRecoveryAction);
        }
      };

      // Start upload
      uploadIdRef.current = `travel_upload_${Date.now()}_${retryCount}`;
      const result = await enhancedUploadService.uploadAudioBlob(
        processedAudio.blob,
        uploadConfig,
        uploadIdRef.current
      );

      return result;

    } catch (error: any) {
      console.error('Processing/upload error:', error);
      setButtonState('error');
      
      if (error.type && error.category) {
        setUploadError(error);
        showUploadError(error, handleRecoveryAction);
      } else {
        const detailedError: DetailedUploadError = {
          type: 'validation_file_corrupted',
          category: 'validation',
          message: error.message || 'Failed to process audio',
          retryable: false,
          autoRetryable: false,
          manualRetryable: true,
          suggestedAction: 'Try recording your travel plans again',
          userFriendlyMessage: '🎤 Oops! Your recording seems to have gotten lost in transit. Try recording again!',
          technicalDetails: error.message,
          recoveryOptions: [
            {
              id: 'try_different_file',
              label: 'Record New Travel Plans',
              description: 'Start fresh with a new recording',
              action: 'try_different_file',
              primary: true
            }
          ]
        };
        setUploadError(detailedError);
        showUploadError(detailedError, handleRecoveryAction);
      }
      throw error;
    }
  }, [audioBlob, transcript, audioMetadata, retryCount, showUploadError, showSuccess, showInfo, onUploadSuccess, onUploadError]);

  const handleCreateItinerary = useCallback(async () => {
    if (!audioBlob) {
      showWarning('No travel plans recorded! 🎤', 'Please record your travel conversation first.');
      return;
    }

    if (!navigator.onLine) {
      showWarning('No internet connection! 📶', 'Check your connection and try again.');
      return;
    }

    try {
      await performUpload();
    } catch (error) {
      // Error already handled in performUpload
    }
  }, [audioBlob, performUpload, showWarning]);

  const handleRecoveryAction = useCallback(async (
    action: string,
    option: any
  ) => {
    console.log('Recovery action:', action, option);

    switch (action) {
      case 'retry':
        setRetryCount(prev => prev + 1);
        setButtonState('idle');
        try {
          await performUpload();
        } catch (error) {
          // Error handled in performUpload
        }
        break;

      case 'retry_with_smaller_chunks':
        setRetryCount(prev => prev + 1);
        setButtonState('idle');
        showInfo('🧳 Trying smaller travel segments...', 'Breaking your plans into smaller pieces for better delivery.');
        try {
          await performUpload({ smallerChunks: true });
        } catch (error) {
          // Error handled in performUpload
        }
        break;

      case 'retry_without_chunks':
        setRetryCount(prev => prev + 1);
        setButtonState('idle');
        showInfo('📦 Sending as one complete package...', 'Trying a different upload approach.');
        try {
          await performUpload({ withoutChunks: true });
        } catch (error) {
          // Error handled in performUpload
        }
        break;

      case 'try_different_file':
        setButtonState('idle');
        setUploadError(null);
        setRetryCount(0);
        showInfo('🎙️ Ready for new travel plans!', 'Record your travel conversation and try again.');
        break;

      default:
        console.warn('Unknown recovery action:', action);
    }
  }, [performUpload, showInfo]);

  const handleRetry = useCallback(() => {
    setButtonState('idle');
    setUploadError(null);
    handleCreateItinerary();
  }, [handleCreateItinerary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <FileTextIcon className="h-6 w-6 text-black" />
            <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold">Your Travel Conversation</h2>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm transition-all duration-200 hover:scale-105"
          disabled={!transcript}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export Plans
        </button>
      </div>
      
      {/* Transcript Display */}
      <div className="relative">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 max-h-80 overflow-y-auto">
          {transcript ? (
            <div className="whitespace-pre-line text-gray-800 leading-relaxed">
              {transcript}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Your travel conversation will appear here...</p>
              <p className="text-sm">Start recording to capture your travel plans! ✈️</p>
            </div>
          )}
        </div>
        
        {/* Decorative corner elements */}
        <div className="absolute top-2 right-2 text-blue-300">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <div className="absolute bottom-2 left-2 text-purple-300">
          <MapPin className="h-4 w-4" />
        </div>
      </div>

      {/* Enhanced Itinerary Button */}
      <div className="space-y-4">
        <EnhancedItineraryButton
          state={buttonState}
          progress={uploadProgress?.percentage || 0}
          onClick={handleCreateItinerary}
          onRetry={handleRetry}
          disabled={!audioBlob || !navigator.onLine}
          className="w-full"
          size="large"
        />

        {/* Progress Details */}
        <ProgressDetails
          state={buttonState}
          progress={uploadProgress?.percentage || 0}
          speed={uploadProgress?.speed}
          remainingTime={uploadProgress?.remainingTime}
        />

        {/* Helper Text */}
        <div className="text-center text-sm text-gray-600">
          {!audioBlob && (
            <p className="flex items-center justify-center space-x-1">
              <span>🎤</span>
              <span>Record your travel conversation to get started</span>
            </p>
          )}
          {audioBlob && !navigator.onLine && (
            <p className="flex items-center justify-center space-x-1 text-red-600">
              <span>📶</span>
              <span>No internet connection - please check your connection</span>
            </p>
          )}
          {audioBlob && navigator.onLine && buttonState === 'idle' && (
            <p className="flex items-center justify-center space-x-1 text-green-600">
              <span>✨</span>
              <span>Ready to create your personalized itinerary!</span>
            </p>
          )}
          {retryCount > 0 && (
            <p className="text-amber-600">
              🔄 Retry attempt #{retryCount} - We're working hard to process your travel plans!
            </p>
          )}
        </div>

        {/* Travel Stats */}
        {transcript && buttonState === 'idle' && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              Travel Conversation Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{transcript.split(' ').length}</div>
                <div className="text-xs text-gray-600">Words spoken</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {Math.ceil(transcript.length / 1000)}min
                </div>
                <div className="text-xs text-gray-600">Est. read time</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {(transcript.match(/\b(go|visit|see|trip|travel)\b/gi) || []).length}
                </div>
                <div className="text-xs text-gray-600">Travel mentions</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">
                  {(transcript.match(/\b(hotel|restaurant|museum|beach|park)\b/gi) || []).length}
                </div>
                <div className="text-xs text-gray-600">Places mentioned</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};