import { useState, useCallback, useRef } from 'react';
import { ChunkedAudioRecorder, RecordingState as ChunkedRecordingState } from '../utils/chunkedAudioRecorder';
import { AudioProcessor, ProcessedAudioBlob } from '../utils/audioProcessor';
import { transcriptionService, TranscriptionResult, TranscriptionError } from '../services/transcriptionService';
import { useEnhancedNotifications } from '../components/EnhancedErrorNotification';

export interface IntegratedRecordingState {
  // Recording states
  isRecording: boolean;
  recordingState: ChunkedRecordingState;
  
  // Processing states
  isProcessingAudio: boolean;
  isTranscribing: boolean;
  transcriptionProgress: number;
  
  // Results
  audioBlob: Blob | null;
  processedAudio: ProcessedAudioBlob | null;
  transcriptionResult: TranscriptionResult | null;
  
  // Status flags
  recordingComplete: boolean;
  transcriptionComplete: boolean;
  error: string | null;
}

export interface UseIntegratedRecordingOptions {
  autoTranscribe?: boolean;
  enableTravelAnalysis?: boolean;
  onRecordingComplete?: (audioBlob: Blob, metadata: any) => void;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}

export const useIntegratedRecording = (options: UseIntegratedRecordingOptions = {}) => {
  const { showError, showSuccess, showInfo, showWarning } = useEnhancedNotifications();
  
  const [state, setState] = useState<IntegratedRecordingState>({
    isRecording: false,
    recordingState: {
      isRecording: false,
      isPaused: false,
      duration: 0,
      size: 0,
      chunkCount: 0,
      memoryStatus: null,
      hasWarnings: false
    },
    isProcessingAudio: false,
    isTranscribing: false,
    transcriptionProgress: 0,
    audioBlob: null,
    processedAudio: null,
    transcriptionResult: null,
    recordingComplete: false,
    transcriptionComplete: false,
    error: null
  });

  const audioRecorderRef = useRef<ChunkedAudioRecorder | null>(null);
  const audioProcessorRef = useRef(new AudioProcessor());
  const recordedChunksRef = useRef<Blob[]>([]);

  const combineAudioChunks = useCallback((chunks: Blob[]): Blob => {
    const mimeType = chunks[0]?.type || 'audio/webm';
    return new Blob(chunks, { type: mimeType });
  }, []);

  const processAudioForTranscription = useCallback(async (audioBlob: Blob): Promise<ProcessedAudioBlob> => {
    setState(prev => ({ ...prev, isProcessingAudio: true, error: null }));
    
    try {
      showInfo('🎧 Processing audio...', 'Preparing your recording for transcription');
      
      const processed = await audioProcessorRef.current.processAudioBlob(audioBlob);
      
      setState(prev => ({ 
        ...prev, 
        processedAudio: processed, 
        isProcessingAudio: false 
      }));
      
      return processed;
    } catch (error: any) {
      const errorMessage = audioProcessorRef.current.getValidationErrorMessage(error.message);
      setState(prev => ({ 
        ...prev, 
        isProcessingAudio: false, 
        error: errorMessage 
      }));
      showError('Processing failed', errorMessage);
      throw error;
    }
  }, [showError, showInfo]);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    setState(prev => ({ 
      ...prev, 
      isTranscribing: true, 
      transcriptionProgress: 0, 
      error: null 
    }));

    try {
      showInfo('🎤 Starting transcription...', 'Converting your conversation to text');

      const result = await transcriptionService.transcribeAudio(
        audioBlob,
        (progress) => {
          setState(prev => ({ ...prev, transcriptionProgress: progress }));
          
          // Show progress milestones
          if (progress === 25) {
            showInfo('📤 Upload complete', 'Audio uploaded successfully');
          } else if (progress === 75) {
            showInfo('🤖 AI processing...', 'Converting speech to text');
          }
        }
      );

      setState(prev => ({ 
        ...prev, 
        transcriptionResult: result,
        isTranscribing: false,
        transcriptionComplete: true,
        transcriptionProgress: 100
      }));

      // Show travel-themed success message
      const travelContext = result.metadata?.travelContext;
      let successMessage = 'Your conversation has been transcribed!';
      
      if (travelContext) {
        const { destinations, complexity, estimatedDuration } = travelContext;
        if (destinations.length > 0) {
          successMessage = `Found travel plans for ${destinations.slice(0, 2).join(' and ')}${destinations.length > 2 ? ` and ${destinations.length - 2} more destinations` : ''}! ✈️`;
        } else if (complexity === 'complex') {
          successMessage = 'Wow! You have quite the adventure planned! 🗺️';
        } else {
          successMessage = `Your ${estimatedDuration}-day trip sounds amazing! 🌟`;
        }
      }

      showSuccess('🎉 Transcription complete!', successMessage);
      options.onTranscriptionComplete?.(result);
      
      return result;

    } catch (error: any) {
      const transcriptionError = error as TranscriptionError;
      const errorMessage = transcriptionError.message || 'Failed to transcribe audio';
      
      setState(prev => ({ 
        ...prev, 
        isTranscribing: false, 
        transcriptionProgress: 0,
        error: errorMessage 
      }));

      // Show user-friendly error messages
      if (transcriptionError.code === 'timeout_error') {
        showWarning('⏰ Transcription timeout', 'The transcription took too long. Try with a shorter recording.');
      } else if (transcriptionError.code === 'file_too_large') {
        showError('📁 File too large', 'Your recording is too large. Try recording a shorter conversation.');
      } else if (transcriptionError.code === 'unsupported_format') {
        showError('🎵 Format not supported', 'The audio format is not supported. Please try recording again.');
      } else {
        showError('🚨 Transcription failed', errorMessage);
      }

      options.onError?.(new Error(errorMessage));
      throw error;
    }
  }, [showError, showSuccess, showInfo, showWarning, options]);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        recordingComplete: false,
        transcriptionComplete: false,
        audioBlob: null,
        processedAudio: null,
        transcriptionResult: null,
        error: null 
      }));
      
      recordedChunksRef.current = [];

      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new ChunkedAudioRecorder({
          onChunkReady: (chunk) => {
            recordedChunksRef.current.push(chunk);
          },
          onRecordingComplete: async (chunks, metadata) => {
            const combinedBlob = combineAudioChunks(chunks);
            
            setState(prev => ({ 
              ...prev, 
              audioBlob: combinedBlob,
              recordingComplete: true,
              isRecording: false 
            }));

            showSuccess('🎙️ Recording complete!', 'Your travel conversation has been captured successfully');
            options.onRecordingComplete?.(combinedBlob, metadata);

            // Auto-transcribe if enabled
            if (options.autoTranscribe) {
              try {
                await processAudioForTranscription(combinedBlob);
                await transcribeAudio(combinedBlob);
              } catch (error) {
                console.error('Auto-transcription failed:', error);
                // Error already handled in transcribeAudio
              }
            }
          },
          onError: (error) => {
            setState(prev => ({ 
              ...prev, 
              isRecording: false, 
              error: error.message 
            }));
            showError('Recording error', error.message);
            options.onError?.(error);
          }
        });
        
        await audioRecorderRef.current.initialize(true, true);
      }

      await audioRecorderRef.current.startRecording();
      showInfo('🎙️ Recording started', 'Share your travel dreams and plans!');
      
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: error.message 
      }));
      showError('Failed to start recording', error.message);
      throw error;
    }
  }, [options, combineAudioChunks, processAudioForTranscription, transcribeAudio, showInfo, showSuccess, showError]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!audioRecorderRef.current) return null;

    try {
      await audioRecorderRef.current.stopRecording();
      setState(prev => ({ ...prev, isRecording: false }));
      
      // The onRecordingComplete callback will handle the rest
      return recordedChunksRef.current.length > 0 ? 
        combineAudioChunks(recordedChunksRef.current) : null;
        
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: error.message 
      }));
      showError('Failed to stop recording', error.message);
      throw error;
    }
  }, [combineAudioChunks, showError]);

  const retryTranscription = useCallback(async (): Promise<void> => {
    if (!state.audioBlob) {
      showWarning('No audio to transcribe', 'Please record audio first');
      return;
    }

    try {
      await transcribeAudio(state.audioBlob);
    } catch (error) {
      // Error already handled in transcribeAudio
    }
  }, [state.audioBlob, transcribeAudio, showWarning]);

  const manualTranscribe = useCallback(async (): Promise<void> => {
    if (!state.audioBlob) {
      showWarning('No audio to transcribe', 'Please record audio first');
      return;
    }

    try {
      if (!state.processedAudio) {
        await processAudioForTranscription(state.audioBlob);
      }
      await transcribeAudio(state.audioBlob);
    } catch (error) {
      // Error already handled in the respective functions
    }
  }, [state.audioBlob, state.processedAudio, processAudioForTranscription, transcribeAudio, showWarning]);

  const getRecordingState = useCallback(async (): Promise<ChunkedRecordingState | null> => {
    if (!audioRecorderRef.current) return null;
    
    try {
      const recordingState = await audioRecorderRef.current.getRecordingStateWithMemory();
      setState(prev => ({ ...prev, recordingState }));
      return recordingState;
    } catch (error) {
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isRecording: false,
      recordingState: {
        isRecording: false,
        isPaused: false,
        duration: 0,
        size: 0,
        chunkCount: 0,
        memoryStatus: null,
        hasWarnings: false
      },
      isProcessingAudio: false,
      isTranscribing: false,
      transcriptionProgress: 0,
      audioBlob: null,
      processedAudio: null,
      transcriptionResult: null,
      recordingComplete: false,
      transcriptionComplete: false,
      error: null
    });
    recordedChunksRef.current = [];
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startRecording,
    stopRecording,
    manualTranscribe,
    retryTranscription,
    getRecordingState,
    reset,
    
    // Computed properties
    canTranscribe: !state.isTranscribing && state.audioBlob !== null,
    isProcessing: state.isProcessingAudio || state.isTranscribing,
    hasAudio: state.audioBlob !== null,
    hasTranscript: state.transcriptionResult !== null,
    transcript: state.transcriptionResult?.transcript || '',
    travelAnalysis: state.transcriptionResult?.metadata?.travelContext
  };
};