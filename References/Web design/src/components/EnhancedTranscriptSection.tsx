import { useState, useCallback, useRef, useEffect } from 'react';
import { FileTextIcon, DownloadIcon, Upload, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { enhancedUploadService, DetailedUploadError, UploadProgress, RecoveryOption } from '../utils/enhancedUploadService';
import { AudioProcessor } from '../utils/audioProcessor';
import { useEnhancedNotifications } from './EnhancedErrorNotification';
import { UploadErrorRecovery, UploadStatusIndicator, ConnectionStatus } from './UploadErrorRecovery';

interface EnhancedTranscriptSectionProps {
  transcript: string;
  audioBlob?: Blob;
  audioMetadata?: any;
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: DetailedUploadError) => void;
}

type UploadState = 'idle' | 'processing' | 'uploading' | 'success' | 'error';

export const EnhancedTranscriptSection = ({
  transcript,
  audioBlob,
  audioMetadata,
  onUploadSuccess,
  onUploadError
}: EnhancedTranscriptSectionProps) => {
  const { showUploadError, showSuccess, showInfo, showWarning } = useEnhancedNotifications();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<DetailedUploadError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const uploadIdRef = useRef<string | null>(null);
  const audioProcessorRef = useRef(new AudioProcessor());

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExport = useCallback(() => {
    if (!transcript) return;
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showInfo('Transcript exported', 'Your transcript has been downloaded.');
  }, [transcript, showInfo]);

  const performUpload = useCallback(async (
    options?: { smallerChunks?: boolean; withoutChunks?: boolean }
  ): Promise<any> => {
    if (!audioBlob) {
      throw new Error('No audio available');
    }

    setUploadState('processing');
    setUploadError(null);
    setUploadProgress(null);

    try {
      // Process and validate audio
      const processedAudio = await audioProcessorRef.current.processAudioBlob(audioBlob);
      
      setUploadState('uploading');
      
      // Configure upload with recovery options
      const uploadConfig = {
        endpoint: process.env.REACT_APP_API_URL || '/api/transcribe',
        enableChunking: options?.withoutChunks ? false : processedAudio.metadata.size > 10 * 1024 * 1024,
        chunkSize: options?.smallerChunks ? 2 * 1024 * 1024 : 5 * 1024 * 1024, // 2MB or 5MB chunks
        maxRetries: 3,
        timeout: 300000, // 5 minutes
        headers: {
          'X-Client-Version': '1.0.0',
          'X-Retry-Count': retryCount.toString(),
        },
        metadata: {
          duration: processedAudio.metadata.duration,
          codec: processedAudio.metadata.codec,
          mimeType: processedAudio.metadata.mimeType,
          transcript: transcript.substring(0, 1000),
          retryCount,
          clientTimestamp: new Date().toISOString(),
          ...audioMetadata
        },
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
        onChunkComplete: (chunkIndex: number, totalChunks: number) => {
          if (totalChunks > 1) {
            showInfo(
              'Upload progress',
              `Uploaded chunk ${chunkIndex} of ${totalChunks}`
            );
          }
        },
        onComplete: (response: any) => {
          setUploadState('success');
          setRetryCount(0);
          showSuccess(
            'Upload complete',
            'Your itinerary is being created. You will receive it via email shortly.'
          );
          onUploadSuccess?.(response);
        },
        onError: (error: DetailedUploadError) => {
          console.error('Upload error:', error);
          setUploadState('error');
          setUploadError(error);
          onUploadError?.(error);
          
          // Show enhanced error notification with recovery options
          showUploadError(error, handleRecoveryAction);
        }
      };

      // Start upload
      uploadIdRef.current = `upload_${Date.now()}_${retryCount}`;
      const result = await enhancedUploadService.uploadAudioBlob(
        processedAudio.blob,
        uploadConfig,
        uploadIdRef.current
      );

      return result;

    } catch (error: any) {
      console.error('Processing/upload error:', error);
      setUploadState('error');
      
      if (error.type && error.category) {
        // Already a DetailedUploadError
        setUploadError(error);
        showUploadError(error, handleRecoveryAction);
      } else {
        // Convert to DetailedUploadError
        const detailedError: DetailedUploadError = {
          type: 'validation_file_corrupted',
          category: 'validation',
          message: error.message || 'Failed to process audio',
          retryable: false,
          autoRetryable: false,
          manualRetryable: true,
          suggestedAction: 'Try recording a new audio file',
          userFriendlyMessage: audioProcessorRef.current.getValidationErrorMessage(error.message),
          technicalDetails: error.message,
          recoveryOptions: [
            {
              id: 'try_different_file',
              label: 'Record New Audio',
              description: 'Create a fresh recording',
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
      showWarning('No audio available', 'Please record audio before creating an itinerary.');
      return;
    }

    if (!isOnline) {
      showWarning('No internet connection', 'Please check your connection and try again.');
      return;
    }

    try {
      await performUpload();
    } catch (error) {
      // Error already handled in performUpload
    }
  }, [audioBlob, isOnline, performUpload, showWarning]);

  const handleRecoveryAction = useCallback(async (
    action: RecoveryOption['action'],
    option: RecoveryOption
  ) => {
    console.log('Recovery action:', action, option);

    switch (action) {
      case 'retry':
        setRetryCount(prev => prev + 1);
        try {
          await performUpload();
        } catch (error) {
          // Error handled in performUpload
        }
        break;

      case 'retry_with_smaller_chunks':
        setRetryCount(prev => prev + 1);
        try {
          await performUpload({ smallerChunks: true });
        } catch (error) {
          // Error handled in performUpload
        }
        break;

      case 'retry_without_chunks':
        setRetryCount(prev => prev + 1);
        try {
          await performUpload({ withoutChunks: true });
        } catch (error) {
          // Error handled in performUpload
        }
        break;

      case 'check_connection':
        // Test connection
        try {
          const response = await fetch('/api/health', { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            showSuccess('Connection OK', 'Your internet connection is working.');
          } else {
            showWarning('Connection issue', 'Server may be experiencing problems.');
          }
        } catch (error) {
          showWarning('Connection failed', 'Unable to reach the server.');
        }
        break;

      case 'refresh_page':
        window.location.reload();
        break;

      case 'contact_support':
        // Open support/help
        window.open('mailto:support@example.com?subject=Upload Error&body=' + 
          encodeURIComponent(`Error details:\n${JSON.stringify(uploadError, null, 2)}`));
        break;

      case 'try_different_file':
        // Reset to allow new recording
        setUploadState('idle');
        setUploadError(null);
        setRetryCount(0);
        showInfo('Ready for new recording', 'Please record a new audio file and try again.');
        break;

      default:
        console.warn('Unknown recovery action:', action);
    }
  }, [performUpload, uploadError, showSuccess, showWarning, showInfo]);

  const handleCancelUpload = useCallback(() => {
    if (uploadIdRef.current && uploadState === 'uploading') {
      enhancedUploadService.cancelUpload(uploadIdRef.current);
      setUploadState('idle');
      setUploadProgress(null);
      showInfo('Upload cancelled', 'The upload has been cancelled.');
    }
  }, [uploadState, showInfo]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getButtonContent = () => {
    switch (uploadState) {
      case 'processing':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing audio...
          </>
        );
      case 'uploading':
        return (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {uploadProgress 
              ? `Uploading... ${uploadProgress.percentage}%`
              : 'Starting upload...'}
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Itinerary created!
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="h-4 w-4 mr-2" />
            Upload failed - See details below
          </>
        );
      default:
        return 'Create our itinerary';
    }
  };

  const isButtonDisabled = uploadState === 'processing' || uploadState === 'uploading' || uploadState === 'success';

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <FileTextIcon className="h-6 w-6 text-black mr-2" />
          <h2 className="text-2xl font-semibold">Transcript</h2>
        </div>
        <div className="flex items-center space-x-4">
          <ConnectionStatus isOnline={isOnline} />
          <button 
            onClick={handleExport}
            className="flex items-center bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md text-sm transition-colors"
            disabled={!transcript}
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-80 overflow-y-auto whitespace-pre-line">
        {transcript || 'Your transcript will appear here after recording...'}
      </div>

      {/* Upload Status Indicator */}
      {uploadError && (
        <UploadStatusIndicator 
          error={uploadError}
          isRetrying={uploadState === 'uploading' && retryCount > 0}
          retryCount={retryCount}
        />
      )}
      
      <div className="space-y-4">
        {/* Upload Button */}
        <div className="relative">
          <button 
            onClick={uploadState === 'uploading' ? handleCancelUpload : handleCreateItinerary}
            disabled={isButtonDisabled || !audioBlob || !isOnline}
            className={`
              relative overflow-hidden w-full px-4 py-3 rounded-md font-medium
              transition-all duration-300 flex items-center justify-center
              ${isButtonDisabled || !audioBlob || !isOnline
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : uploadState === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : uploadState === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-black hover:bg-gray-800 text-white'
              }
            `}
          >
            {/* Progress fill effect */}
            {uploadState === 'uploading' && uploadProgress && (
              <div 
                className="absolute inset-0 bg-gray-700 transition-all duration-300 ease-out"
                style={{ 
                  width: `${uploadProgress.percentage}%`,
                  opacity: 0.3
                }}
              />
            )}
            
            <span className="relative z-10 flex items-center">
              {getButtonContent()}
            </span>
          </button>
          
          {/* Button helper text */}
          {!isOnline && (
            <p className="text-xs text-red-500 text-center mt-1">
              No internet connection
            </p>
          )}
          {uploadState === 'uploading' && (
            <p className="text-xs text-gray-500 text-center mt-1">
              Click to cancel upload
            </p>
          )}
          {retryCount > 0 && uploadState !== 'uploading' && (
            <p className="text-xs text-gray-500 text-center mt-1">
              Retry attempt #{retryCount}
            </p>
          )}
        </div>

        {/* Upload Progress Details */}
        {uploadState === 'uploading' && uploadProgress && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Progress:</span>
              <span className="font-medium">{uploadProgress.percentage}%</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Speed:</span>
              <span className="font-medium">{formatSpeed(uploadProgress.speed)}</span>
            </div>
            {uploadProgress.remainingTime > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Time remaining:</span>
                <span className="font-medium">{formatTime(uploadProgress.remainingTime)}</span>
              </div>
            )}
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div 
                className="bg-black h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadState === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Your itinerary has been created and will be sent to your email shortly.
            </div>
          </div>
        )}

        {/* Error Recovery Panel */}
        {uploadState === 'error' && uploadError && (
          <UploadErrorRecovery
            error={uploadError}
            onRecoveryAction={handleRecoveryAction}
            isRetrying={uploadState === 'uploading'}
            retryCount={retryCount}
          />
        )}
      </div>
    </div>
  );
};