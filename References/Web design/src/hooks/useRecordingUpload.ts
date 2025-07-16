import { useState, useCallback, useRef } from 'react';
import { ChunkedAudioRecorder, RecordingState as ChunkedRecordingState } from '../utils/chunkedAudioRecorder';
import { AudioProcessor, ProcessedAudioBlob } from '../utils/audioProcessor';
import { uploadService, UploadProgress, UploadConfig } from '../utils/uploadService';
import { useNotifications } from '../components/ErrorNotification';

export interface RecordingUploadState {
  isRecording: boolean;
  isProcessing: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  processedAudio: ProcessedAudioBlob | null;
  error: string | null;
}

export interface UseRecordingUploadOptions {
  uploadEndpoint?: string;
  autoUpload?: boolean;
  onRecordingComplete?: (blob: Blob, metadata: any) => void;
  onUploadComplete?: (response: any) => void;
  onError?: (error: Error) => void;
}

export const useRecordingUpload = (options: UseRecordingUploadOptions = {}) => {
  const { showError, showSuccess, showInfo } = useNotifications();
  const [state, setState] = useState<RecordingUploadState>({
    isRecording: false,
    isProcessing: false,
    isUploading: false,
    uploadProgress: null,
    processedAudio: null,
    error: null
  });

  const audioRecorderRef = useRef<ChunkedAudioRecorder | null>(null);
  const audioProcessorRef = useRef(new AudioProcessor());
  const uploadIdRef = useRef<string | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const combineAudioChunks = useCallback((chunks: Blob[]): Blob => {
    // Combine all chunks into a single blob
    const mimeType = chunks[0]?.type || 'audio/webm';
    return new Blob(chunks, { type: mimeType });
  }, []);

  const processAndPrepareAudio = useCallback(async (audioBlob: Blob): Promise<ProcessedAudioBlob> => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const processed = await audioProcessorRef.current.processAudioBlob(audioBlob);
      setState(prev => ({ ...prev, processedAudio: processed, isProcessing: false }));
      return processed;
    } catch (error: any) {
      const errorMessage = audioProcessorRef.current.getValidationErrorMessage(error.message);
      setState(prev => ({ ...prev, isProcessing: false, error: errorMessage }));
      showError('Processing failed', errorMessage);
      throw error;
    }
  }, [showError]);

  const uploadAudio = useCallback(async (
    processedAudio: ProcessedAudioBlob,
    additionalMetadata?: any
  ): Promise<any> => {
    setState(prev => ({ ...prev, isUploading: true, uploadProgress: null, error: null }));
    
    const uploadConfig: UploadConfig = {
      endpoint: options.uploadEndpoint || process.env.REACT_APP_API_URL || '/api/transcribe',
      enableChunking: processedAudio.metadata.size > 10 * 1024 * 1024,
      chunkSize: 5 * 1024 * 1024,
      maxRetries: 3,
      timeout: 300000,
      metadata: {
        ...processedAudio.metadata,
        ...additionalMetadata
      },
      onProgress: (progress) => {
        setState(prev => ({ ...prev, uploadProgress: progress }));
      },
      onComplete: (response) => {
        setState(prev => ({ 
          ...prev, 
          isUploading: false, 
          uploadProgress: null 
        }));
        showSuccess('Upload complete', 'Your recording has been uploaded successfully.');
        options.onUploadComplete?.(response);
      },
      onError: (error) => {
        setState(prev => ({ 
          ...prev, 
          isUploading: false, 
          uploadProgress: null,
          error: error.message 
        }));
        showError('Upload failed', error.message);
        options.onError?.(new Error(error.message));
      }
    };

    try {
      uploadIdRef.current = `upload_${Date.now()}`;
      const result = await uploadService.uploadAudioBlob(
        processedAudio.blob,
        uploadConfig,
        uploadIdRef.current
      );
      return result;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        uploadProgress: null,
        error: error.message 
      }));
      throw error;
    }
  }, [options, showError, showSuccess]);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isRecording: true, error: null }));
      recordedChunksRef.current = [];

      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new ChunkedAudioRecorder({
          onChunkReady: (chunk) => {
            recordedChunksRef.current.push(chunk);
          },
          onRecordingComplete: async (chunks, metadata) => {
            const combinedBlob = combineAudioChunks(chunks);
            options.onRecordingComplete?.(combinedBlob, metadata);
            
            if (options.autoUpload) {
              try {
                const processed = await processAndPrepareAudio(combinedBlob);
                await uploadAudio(processed, { recordingMetadata: metadata });
              } catch (error) {
                console.error('Auto-upload failed:', error);
              }
            }
          },
          onError: (error) => {
            setState(prev => ({ ...prev, isRecording: false, error: error.message }));
            showError('Recording error', error.message);
            options.onError?.(error);
          }
        });
        
        await audioRecorderRef.current.initialize(true, true);
      }

      await audioRecorderRef.current.startRecording();
      showInfo('Recording started', 'Your conversation is being recorded.');
    } catch (error: any) {
      setState(prev => ({ ...prev, isRecording: false, error: error.message }));
      showError('Failed to start recording', error.message);
      throw error;
    }
  }, [options, combineAudioChunks, processAndPrepareAudio, uploadAudio, showInfo, showError]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!audioRecorderRef.current) return null;

    try {
      await audioRecorderRef.current.stopRecording();
      setState(prev => ({ ...prev, isRecording: false }));
      
      // Return the combined audio blob
      if (recordedChunksRef.current.length > 0) {
        return combineAudioChunks(recordedChunksRef.current);
      }
      return null;
    } catch (error: any) {
      setState(prev => ({ ...prev, isRecording: false, error: error.message }));
      showError('Failed to stop recording', error.message);
      throw error;
    }
  }, [combineAudioChunks, showError]);

  const cancelUpload = useCallback(() => {
    if (uploadIdRef.current && state.isUploading) {
      uploadService.cancelUpload(uploadIdRef.current);
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        uploadProgress: null 
      }));
      showInfo('Upload cancelled', 'The upload has been cancelled.');
    }
  }, [state.isUploading, showInfo]);

  const getRecordingState = useCallback(async (): Promise<ChunkedRecordingState | null> => {
    if (!audioRecorderRef.current) return null;
    return await audioRecorderRef.current.getRecordingStateWithMemory();
  }, []);

  const reset = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      isUploading: false,
      uploadProgress: null,
      processedAudio: null,
      error: null
    });
    recordedChunksRef.current = [];
    uploadIdRef.current = null;
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startRecording,
    stopRecording,
    processAndPrepareAudio,
    uploadAudio,
    cancelUpload,
    getRecordingState,
    reset,
    
    // Utilities
    isActive: state.isRecording || state.isProcessing || state.isUploading,
    canUpload: !state.isUploading && state.processedAudio !== null,
    hasError: state.error !== null
  };
};