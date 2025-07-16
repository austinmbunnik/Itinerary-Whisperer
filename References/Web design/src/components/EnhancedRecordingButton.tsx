import React from 'react';
import { 
  MicIcon, 
  StopCircleIcon, 
  AlertCircle, 
  RefreshCw, 
  XCircle,
  WifiOff,
  HardDriveIcon,
  Settings
} from 'lucide-react';
import { ErrorState, ErrorType } from '../utils/errorStateManager';

export type RecordingButtonState = 
  | 'idle'
  | 'recording'
  | 'paused'
  | 'initializing'
  | 'error'
  | 'retrying'
  | 'disabled';

interface EnhancedRecordingButtonProps {
  state: RecordingButtonState;
  errorState?: ErrorState;
  onClick: () => void;
  onRetry?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const EnhancedRecordingButton: React.FC<EnhancedRecordingButtonProps> = ({
  state,
  errorState,
  onClick,
  onRetry,
  disabled = false,
  size = 'large'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-12 h-12';
      case 'medium':
        return 'w-16 h-16';
      case 'large':
      default:
        return 'w-24 h-24';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'h-6 w-6';
      case 'medium':
        return 'h-8 w-8';
      case 'large':
      default:
        return 'h-12 w-12';
    }
  };

  const getErrorIcon = (errorType?: ErrorType) => {
    if (!errorType) return <XCircle className={`${getIconSize()} text-white`} />;
    
    switch (errorType) {
      case 'permission_denied':
      case 'permission_revoked':
        return <Settings className={`${getIconSize()} text-white`} />;
      case 'no_microphone':
        return <MicIcon className={`${getIconSize()} text-white opacity-50`} />;
      case 'network_error':
        return <WifiOff className={`${getIconSize()} text-white`} />;
      case 'memory_error':
        return <HardDriveIcon className={`${getIconSize()} text-white`} />;
      default:
        return <AlertCircle className={`${getIconSize()} text-white`} />;
    }
  };

  const getButtonProps = () => {
    switch (state) {
      case 'recording':
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 bg-red-500 animate-pulse hover:bg-red-600 active:scale-95`,
          icon: <StopCircleIcon className={`${getIconSize()} text-white`} />,
          clickable: true
        };
      
      case 'paused':
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 bg-amber-500 hover:bg-amber-600 active:scale-95`,
          icon: <MicIcon className={`${getIconSize()} text-white`} />,
          clickable: true
        };
      
      case 'initializing':
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center cursor-wait transition-all duration-300 bg-blue-500`,
          icon: <RefreshCw className={`${getIconSize()} text-white animate-spin`} />,
          clickable: false
        };
      
      case 'retrying':
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center cursor-wait transition-all duration-300 bg-amber-500`,
          icon: <RefreshCw className={`${getIconSize()} text-white animate-spin`} />,
          clickable: false
        };
      
      case 'error':
        const canRetry = errorState?.currentError?.recoveryActions.includes('retry');
        
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center transition-all duration-300 ${
            canRetry 
              ? 'cursor-pointer bg-red-500 hover:bg-red-600 active:scale-95 animate-pulse' 
              : 'cursor-not-allowed bg-red-400'
          }`,
          icon: getErrorIcon(errorState?.currentError?.type),
          clickable: canRetry && !disabled
        };
      
      case 'disabled':
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center cursor-not-allowed transition-all duration-300 bg-gray-400`,
          icon: <MicIcon className={`${getIconSize()} text-white opacity-50`} />,
          clickable: false
        };
      
      case 'idle':
      default:
        return {
          className: `${getSizeClasses()} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 bg-black hover:bg-gray-800 hover:scale-105 active:scale-95`,
          icon: <MicIcon className={`${getIconSize()} text-white`} />,
          clickable: !disabled
        };
    }
  };

  const buttonProps = getButtonProps();

  const handleClick = () => {
    if (!buttonProps.clickable || disabled) return;
    
    if (state === 'error' && onRetry) {
      onRetry();
    } else {
      onClick();
    }
  };

  return (
    <div className="relative">
      <div 
        className={buttonProps.className}
        onClick={handleClick}
        role="button"
        tabIndex={buttonProps.clickable ? 0 : -1}
        aria-label={getAriaLabel(state, errorState)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && buttonProps.clickable) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {buttonProps.icon}
      </div>
      
      {/* Error indicator */}
      {state === 'error' && errorState?.currentError && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>
      )}
      
      {/* Retry indicator */}
      {(state === 'retrying' || (state === 'error' && errorState?.isRetrying)) && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="px-2 py-1 bg-amber-100 border border-amber-300 rounded-full">
            <span className="text-xs text-amber-800 font-medium">
              Retry {errorState?.retryCount || 1}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

function getAriaLabel(state: RecordingButtonState, errorState?: ErrorState): string {
  switch (state) {
    case 'recording':
      return 'Stop recording';
    case 'paused':
      return 'Resume recording';
    case 'initializing':
      return 'Initializing recording...';
    case 'retrying':
      return 'Retrying connection...';
    case 'error':
      const canRetry = errorState?.currentError?.recoveryActions.includes('retry');
      if (canRetry) {
        return `Recording error: ${errorState?.currentError?.message}. Click to retry.`;
      }
      return `Recording error: ${errorState?.currentError?.message}`;
    case 'disabled':
      return 'Recording unavailable';
    case 'idle':
    default:
      return 'Start recording';
  }
}

// Status text component to accompany the button
interface RecordingButtonStatusProps {
  state: RecordingButtonState;
  errorState?: ErrorState;
  duration?: number;
  compact?: boolean;
}

export const RecordingButtonStatus: React.FC<RecordingButtonStatusProps> = ({
  state,
  errorState,
  duration = 0,
  compact = false
}) => {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (state) {
      case 'recording':
        return (
          <span className="text-red-600 font-medium">
            Recording... {formatDuration(duration)} • Click to stop
          </span>
        );
      
      case 'paused':
        return (
          <span className="text-amber-600 font-medium">
            Paused at {formatDuration(duration)} • Click to resume
          </span>
        );
      
      case 'initializing':
        return (
          <span className="text-blue-600">
            Setting up recording...
          </span>
        );
      
      case 'retrying':
        return (
          <span className="text-amber-600">
            Retrying connection... (Attempt {errorState?.retryCount || 1})
          </span>
        );
      
      case 'error':
        const error = errorState?.currentError;
        if (!error) return null;
        
        const canRetry = error.recoveryActions.includes('retry');
        
        return (
          <div className="text-center space-y-1">
            <span className="text-red-600 font-medium block">
              {error.message}
            </span>
            {!compact && error.details && (
              <span className="text-gray-600 text-sm block">
                {error.details}
              </span>
            )}
            {canRetry && (
              <span className="text-blue-600 text-sm block">
                Click the button to try again
              </span>
            )}
          </div>
        );
      
      case 'disabled':
        return (
          <span className="text-gray-600">
            Recording not available
          </span>
        );
      
      case 'idle':
      default:
        return 'Click to start recording your conversation';
    }
  };

  const statusText = getStatusText();
  if (!statusText) return null;

  return (
    <p className={`text-lg text-center ${compact ? 'text-sm' : ''}`}>
      {statusText}
    </p>
  );
};