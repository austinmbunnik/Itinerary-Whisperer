import { useState, useCallback, useRef } from 'react';
import { FileTextIcon, DownloadIcon, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { uploadService, UploadProgress, UploadError } from '../utils/uploadService';
import { AudioProcessor } from '../utils/audioProcessor';
import { useNotifications } from './ErrorNotification';

interface TranscriptSectionWithUploadProps {
  transcript: string;
  audioBlob?: Blob;
  audioMetadata?: any;
}

type UploadState = 'idle' | 'processing' | 'uploading' | 'success' | 'error';

export const TranscriptSectionWithUpload = ({
  transcript,
  audioBlob,
  audioMetadata
}: TranscriptSectionWithUploadProps) => {
  const { showError, showWarning, showInfo, showSuccess } = useNotifications();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const audioProcessorRef = useRef(new AudioProcessor());

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

  const handleCreateItinerary = useCallback(async () => {
    if (!audioBlob) {
      showError('No audio available', 'Please record audio before creating an itinerary.');
      return;
    }

    setUploadState('processing');
    setUploadError(null);
    setUploadProgress(null);

    try {
      // Process and validate audio
      const processedAudio = await audioProcessorRef.current.processAudioBlob(audioBlob);
      
      if (processedAudio.metadata.size > 100 * 1024 * 1024) {
        showWarning(
          'Large file detected',
          'Your recording is large and may take longer to upload.'
        );
      }

      setUploadState('uploading');
      
      // Configure upload
      const uploadConfig = {
        endpoint: process.env.REACT_APP_API_URL || '/api/transcribe',
        enableChunking: processedAudio.metadata.size > 10 * 1024 * 1024, // Chunk if > 10MB
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        maxRetries: 3,
        timeout: 300000, // 5 minutes
        headers: {
          'X-Client-Version': '1.0.0',
        },
        metadata: {
          duration: processedAudio.metadata.duration,
          codec: processedAudio.metadata.codec,
          mimeType: processedAudio.metadata.mimeType,
          transcript: transcript.substring(0, 1000), // First 1000 chars
          ...audioMetadata
        },
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
        onChunkComplete: (chunkIndex: number, totalChunks: number) => {
          showInfo(
            'Upload progress',
            `Uploaded chunk ${chunkIndex} of ${totalChunks}`
          );
        },
        onComplete: (response: any) => {
          setUploadState('success');
          showSuccess(
            'Upload complete',
            'Your itinerary is being created. You will receive it via email shortly.'
          );
          console.log('Upload response:', response);
        },
        onError: (error: UploadError) => {
          console.error('Upload error:', error);
          setUploadState('error');
          setUploadError(error.message);
          
          if (error.retryable) {
            showError(
              'Upload failed',
              `${error.message}. Please try again.`
            );
          } else {
            showError(
              'Upload failed',
              error.message
            );
          }
        }
      };

      // Start upload
      uploadIdRef.current = `upload_${Date.now()}`;
      await uploadService.uploadAudioBlob(
        processedAudio.blob,
        uploadConfig,
        uploadIdRef.current
      );

    } catch (error: any) {
      console.error('Processing/upload error:', error);
      setUploadState('error');
      setUploadError(error.message || 'Failed to process audio');
      showError(
        'Processing failed',
        audioProcessorRef.current.getValidationErrorMessage(error.message)
      );
    }
  }, [audioBlob, transcript, audioMetadata, showError, showWarning, showInfo, showSuccess]);

  const handleCancelUpload = useCallback(() => {
    if (uploadIdRef.current) {
      uploadService.cancelUpload(uploadIdRef.current);
      setUploadState('idle');
      setUploadProgress(null);
      showInfo('Upload cancelled', 'The upload has been cancelled.');
    }
  }, [showInfo]);

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
            Upload failed - Try again
          </>
        );
      default:
        return 'Create our itinerary';
    }
  };

  const isButtonDisabled = uploadState === 'processing' || uploadState === 'uploading' || uploadState === 'success';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileTextIcon className="h-6 w-6 text-black mr-2" />
          <h2 className="text-2xl font-semibold">Transcript</h2>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md text-sm transition-colors"
          disabled={!transcript}
        >
          <DownloadIcon className="h-4 w-4 mr-1" />
          Export
        </button>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-80 overflow-y-auto whitespace-pre-line">
        {transcript || 'Your transcript will appear here after recording...'}
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="relative">
          <button 
            onClick={uploadState === 'error' ? handleCreateItinerary : 
                    uploadState === 'uploading' ? handleCancelUpload : 
                    handleCreateItinerary}
            disabled={isButtonDisabled || !audioBlob}
            className={`
              relative overflow-hidden w-full px-4 py-3 rounded-md font-medium
              transition-all duration-300 flex items-center justify-center
              ${isButtonDisabled || !audioBlob
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
          
          {/* Cancel hint for uploading state */}
          {uploadState === 'uploading' && (
            <p className="text-xs text-gray-500 text-center mt-1">
              Click to cancel upload
            </p>
          )}
        </div>

        {/* Upload progress details */}
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

        {/* Error message */}
        {uploadState === 'error' && uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {/* Success message */}
        {uploadState === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
            Your itinerary has been created and will be sent to your email shortly.
          </div>
        )}
      </div>
    </div>
  );
};