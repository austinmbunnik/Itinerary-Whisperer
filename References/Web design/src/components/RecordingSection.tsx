import { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNotifications } from './ErrorNotification';
import { useMicrophonePermission } from '../utils/microphonePermissionManager';
import { PermissionRecoveryDialog } from './PermissionRecoveryDialog';
import { PermissionStatusIndicator } from './PermissionStatusIndicator';
import { UnsupportedBrowserDialog } from './UnsupportedBrowserDialog';
import { ChunkedAudioRecorder, RecordingState as ChunkedRecordingState } from '../utils/chunkedAudioRecorder';
import { MemoryStatus, MemoryManager, ChunkMetadata, RecordingMetrics } from '../utils/memoryManager';
import { RecordingStatusIndicator } from './RecordingStatusIndicator';
import { useErrorState, mapErrorToType, shouldShowErrorUI } from '../utils/errorStateManager';
import { EnhancedRecordingButton, RecordingButtonStatus, RecordingButtonState } from './EnhancedRecordingButton';
import { ErrorRecoveryPanel } from './ErrorRecoveryPanel';
import { FallbackUI } from './FallbackUI';
import { 
  detectBrowserInfo, 
  getRecordingCapabilities, 
  BrowserInfo, 
  RecordingCapabilities,
  getPartialSupportWarnings
} from '../utils/browserCompatibility';

interface RecordingSectionProps {
  isRecording: boolean;
  toggleRecording: () => void;
  onRecordingStateChange?: (state: ChunkedRecordingState) => void;
}

export const RecordingSection = ({
  isRecording,
  toggleRecording,
  onRecordingStateChange
}: RecordingSectionProps) => {
  const { showError, showWarning, showInfo } = useNotifications();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showBrowserDialog, setShowBrowserDialog] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [capabilities, setCapabilities] = useState<RecordingCapabilities | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Error state management
  const {
    errorState,
    setError,
    clearError,
    startRetry,
    retrySuccess,
    retryFailed,
    resetState,
    canRetry
  } = useErrorState();
  
  const audioRecorderRef = useRef<ChunkedAudioRecorder | null>(null);
  const [recordingState, setRecordingState] = useState<ChunkedRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
    chunkCount: 0,
    memoryStatus: null,
    hasWarnings: false
  });
  const recordingStateInterval = useRef<number | null>(null);
  const permissionMonitorCleanupRef = useRef<(() => void) | null>(null);

  const {
    permissionStatus,
    isRetrying,
    retryCount,
    requestPermission,
    checkPermission,
    startPermissionMonitoring,
    stopPermissionMonitoring,
    cleanup,
    monitorPermissionDuringRecording,
    maxRetries
  } = useMicrophonePermission();

  // Check browser compatibility on mount
  useEffect(() => {
    const checkBrowserSupport = async () => {
      const info = detectBrowserInfo();
      const caps = await getRecordingCapabilities();
      
      setBrowserInfo(info);
      setCapabilities(caps);
      
      // Show warnings for partial support
      if (caps.hasMediaRecorder && caps.hasGetUserMedia) {
        const warnings = getPartialSupportWarnings(info, caps);
        warnings.forEach(warning => {
          if (warning.severity === 'high') {
            showError(warning.message, 'Browser compatibility issue');
          } else if (warning.severity === 'medium') {
            showWarning(warning.message, 'Browser compatibility warning');
          }
        });
      }
      
      // Check if browser is completely unsupported
      if (!info.isSupported || !caps.hasMediaRecorder || !caps.hasGetUserMedia) {
        setShowBrowserDialog(true);
      }
    };
    
    checkBrowserSupport();
    checkPermission();
  }, [checkPermission, showError, showWarning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording().catch(() => {});
      }
      if (permissionMonitorCleanupRef.current) {
        permissionMonitorCleanupRef.current();
      }
      if (recordingStateInterval.current) {
        clearInterval(recordingStateInterval.current);
      }
      cleanup();
    };
  }, [cleanup]);

  const handlePermissionRevoked = () => {
    setError('permission_revoked');
    if (isRecording) {
      toggleRecording();
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stopRecording().catch(() => {});
    }
    checkPermission();
  };

  const handleChunkReady = (_chunk: Blob, metadata: ChunkMetadata) => {
    console.log('Chunk ready:', metadata);
    // Here you would typically upload the chunk or store it
  };

  const handleMemoryWarning = (status: MemoryStatus, _metrics: RecordingMetrics) => {
    if (status.isCritical) {
      setError('memory_error', 'Critical memory usage detected', 'Recording quality may be reduced or stopped automatically.');
    } else if (status.isLow) {
      showWarning(
        'Memory Warning',
        'Memory usage is high. Consider stopping the recording soon.'
      );
    }
  };

  const handleDurationWarning = (_duration: number, recommendation: string) => {
    showWarning('Long Recording', recommendation);
  };

  const handleSizeWarning = (_size: number, recommendation: string) => {
    showWarning('Large Recording', recommendation);
  };

  const handleRecordingComplete = (chunks: Blob[], metrics: RecordingMetrics) => {
    const memoryManager = MemoryManager.getInstance();
    showInfo(
      'Recording Complete',
      `Recorded ${memoryManager.formatDuration(metrics.totalDuration)} (${chunks.length} chunks, ${memoryManager.formatMemorySize(metrics.totalSize)})`
    );
    
    // Here you would typically combine chunks and upload
    console.log('Recording complete with metrics:', metrics);
  };

  const initializeRecording = async () => {
    if (!browserInfo || !capabilities) return false;
    
    try {
      // Initialize chunked audio recorder
      audioRecorderRef.current = new ChunkedAudioRecorder({
        onChunkReady: handleChunkReady,
        onMemoryWarning: handleMemoryWarning,
        onDurationWarning: handleDurationWarning,
        onSizeWarning: handleSizeWarning,
        onRecordingComplete: handleRecordingComplete,
        onError: (error) => {
          const errorType = mapErrorToType(error);
          setError(errorType, undefined, error.message);
        }
      });
      
      const config = await audioRecorderRef.current.initialize(true, true); // Enable chunking and adaptive chunking
      
      showInfo(
        'Ready to Record',
        `Using ${config.capabilities.preferredCodec?.codec.toUpperCase()} codec with memory-optimized chunking`
      );
      
      return true;
    } catch (error: any) {
      console.error('Failed to initialize recording:', error);
      
      const errorType = mapErrorToType(error);
      setError(errorType, undefined, error.message);
      
      if (errorType === 'codec_error' || errorType === 'browser_unsupported') {
        setShowBrowserDialog(true);
      }
      
      return false;
    }
  };

  const handleRecordingToggle = async () => {
    setIsInitializing(true);
    
    try {
      if (!isRecording) {
        // Check browser support first
        if (!browserInfo?.isSupported || !capabilities?.hasMediaRecorder) {
          setShowBrowserDialog(true);
          return;
        }
        
        // Request permission
        const { stream, error, permissionStatus: status } = await requestPermission();

        if (error) {
          if (status.state === 'denied') {
            setError('permission_denied');
            setShowPermissionDialog(true);
          } else if (error.name === 'NotFoundError') {
            setError('no_microphone');
          } else if (error.name === 'NotReadableError') {
            setError('microphone_busy');
          } else {
            const errorType = mapErrorToType(error);
            setError(errorType, undefined, error.message);
          }
          return;
        }

        if (stream) {
          // Initialize recording if not already done
          if (!audioRecorderRef.current) {
            const initialized = await initializeRecording();
            if (!initialized) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }
          }
          
          // Start recording
          await audioRecorderRef.current!.startRecording();
          
          // Start updating recording state
          recordingStateInterval.current = window.setInterval(async () => {
            if (audioRecorderRef.current) {
              const state = await audioRecorderRef.current.getRecordingStateWithMemory();
              setRecordingState(state);
              onRecordingStateChange?.(state);
            }
          }, 1000);
          
          showInfo(
            'Recording Started',
            'Your conversation is now being recorded with automatic memory management.'
          );
          
          // Start monitoring for permission revocation during recording
          const cleanup = monitorPermissionDuringRecording(handlePermissionRevoked);
          permissionMonitorCleanupRef.current = cleanup;
          
          toggleRecording();
        }
      } else {
        // Stop recording
        if (audioRecorderRef.current) {
          await audioRecorderRef.current.stopRecording();
        }
        
        if (recordingStateInterval.current) {
          clearInterval(recordingStateInterval.current);
          recordingStateInterval.current = null;
        }
        
        if (permissionMonitorCleanupRef.current) {
          permissionMonitorCleanupRef.current();
          permissionMonitorCleanupRef.current = null;
        }
        
        const finalState = {
          isRecording: false,
          isPaused: false,
          duration: 0,
          size: 0,
          chunkCount: 0,
          memoryStatus: null,
          hasWarnings: false
        };
        setRecordingState(finalState);
        onRecordingStateChange?.(finalState);
        
        showInfo(
          'Recording Stopped',
          'Your recording has been stopped. Processing will begin shortly.'
        );
        
        toggleRecording();
      }
    } catch (error: any) {
      console.error('Recording toggle error:', error);
      const errorType = mapErrorToType(error);
      setError(errorType, undefined, error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRetryPermission = async () => {
    setShowPermissionDialog(false);
    startPermissionMonitoring();
    await handleRecordingToggle();
    stopPermissionMonitoring();
  };

  const handleClosePermissionDialog = () => {
    setShowPermissionDialog(false);
    stopPermissionMonitoring();
  };

  const handleTryAnywayBrowser = () => {
    setShowBrowserDialog(false);
    handleRecordingToggle();
  };

  // Error recovery handlers
  const handleErrorRetry = async () => {
    if (!canRetry()) return;
    
    startRetry();
    clearError();
    
    try {
      await handleRecordingToggle();
      retrySuccess();
    } catch (error: any) {
      retryFailed();
      const errorType = mapErrorToType(error);
      setError(errorType, undefined, error.message);
    }
  };

  const handleErrorRefresh = () => {
    window.location.reload();
  };

  const handleErrorSettings = () => {
    // Open browser settings or permission dialog
    if (errorState.currentError?.type === 'permission_denied' || 
        errorState.currentError?.type === 'permission_revoked') {
      setShowPermissionDialog(true);
    }
  };

  const handleErrorReset = () => {
    resetState();
    // Reset all other states
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      size: 0,
      chunkCount: 0,
      memoryStatus: null,
      hasWarnings: false
    });
    setIsInitializing(false);
  };

  const isPermissionDenied = permissionStatus.state === 'denied';
  const showStatusIndicator = permissionStatus.state !== 'granted' && permissionStatus.state !== 'unknown';
  const isBrowserUnsupported = browserInfo && (!browserInfo.isSupported || !capabilities?.hasMediaRecorder);
  
  // Determine recording button state
  const getRecordingButtonState = (): RecordingButtonState => {
    if (shouldShowErrorUI(errorState)) return 'error';
    if (isInitializing) return 'initializing';
    if (errorState.isRetrying) return 'retrying';
    if (isRecording) return 'recording';
    if (recordingState.isPaused) return 'paused';
    if (isPermissionDenied && !permissionStatus.canRetry) return 'disabled';
    if (isBrowserUnsupported) return 'disabled';
    return 'idle';
  };
  
  const buttonState = getRecordingButtonState();

  return (
    <>
      <div className="flex flex-col items-center bg-white/80 p-8 rounded-lg backdrop-blur-sm relative">
        <h2 className="text-2xl font-bold mb-6">Try it out</h2>
        
        {/* Error Recovery Panel */}
        {shouldShowErrorUI(errorState) && (
          <div className="mb-6 w-full max-w-md">
            <ErrorRecoveryPanel
              errorState={errorState}
              onRetry={handleErrorRetry}
              onRefresh={handleErrorRefresh}
              onOpenSettings={handleErrorSettings}
              onReset={handleErrorReset}
              onDismiss={clearError}
              compact={true}
            />
          </div>
        )}
        
        {/* Browser Warning */}
        {isBrowserUnsupported && !shouldShowErrorUI(errorState) && (
          <div className="mb-4 flex items-center space-x-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-800">
              Limited browser support detected
            </span>
          </div>
        )}
        
        {/* Permission Status Indicator */}
        {showStatusIndicator && !shouldShowErrorUI(errorState) && (
          <div className="mb-4">
            <PermissionStatusIndicator 
              permissionState={permissionStatus.state}
              isRetrying={isRetrying}
            />
          </div>
        )}
        
        {/* Show fallback UI for critical errors */}
        {shouldShowErrorUI(errorState) && errorState.currentError?.severity === 'critical' ? (
          <div className="w-full">
            <FallbackUI
              errorType={errorState.currentError.type}
              onRetry={canRetry() ? handleErrorRetry : undefined}
              onRefresh={handleErrorRefresh}
              onOpenSettings={handleErrorSettings}
              isRetrying={errorState.isRetrying}
            />
          </div>
        ) : (
          <>
            {/* Enhanced Recording Button */}
            <EnhancedRecordingButton
              state={buttonState}
              errorState={errorState}
              onClick={handleRecordingToggle}
              onRetry={handleErrorRetry}
              disabled={isInitializing}
              size="large"
            />
            
            {/* Recording Button Status */}
            <div className="mt-6">
              <RecordingButtonStatus
                state={buttonState}
                errorState={errorState}
                duration={recordingState.duration}
              />
            </div>
            
            {/* Codec Info */}
            {capabilities?.preferredCodec && !isRecording && !shouldShowErrorUI(errorState) && (
              <p className="text-xs text-gray-500 mt-2">
                Will record in {capabilities.preferredCodec.codec.toUpperCase()} format
              </p>
            )}
          </>
        )}
        
        {/* Recording Status */}
        {isRecording && (
          <div className="absolute top-4 right-4">
            <RecordingStatusIndicator recordingState={recordingState} compact />
          </div>
        )}
      </div>

      {/* Permission Recovery Dialog */}
      <PermissionRecoveryDialog
        isOpen={showPermissionDialog}
        onClose={handleClosePermissionDialog}
        onRetry={handleRetryPermission}
        denialType={permissionStatus.denialType || 'unknown'}
        retryCount={retryCount}
        maxRetries={maxRetries}
        isRetrying={isRetrying}
      />
      
      {/* Unsupported Browser Dialog */}
      {browserInfo && capabilities && (
        <UnsupportedBrowserDialog
          isOpen={showBrowserDialog}
          onClose={() => setShowBrowserDialog(false)}
          browserInfo={browserInfo}
          capabilities={capabilities}
          onTryAnyway={capabilities.hasMediaRecorder ? handleTryAnywayBrowser : undefined}
        />
      )}
    </>
  );
};