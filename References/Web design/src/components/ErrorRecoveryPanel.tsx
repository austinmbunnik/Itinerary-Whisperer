import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Download, 
  MessageCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { 
  ErrorState, 
  ErrorType, 
  RecoveryAction, 
  getErrorDisplayProps
} from '../utils/errorStateManager';

interface ErrorRecoveryPanelProps {
  errorState: ErrorState;
  onRetry: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export const ErrorRecoveryPanel: React.FC<ErrorRecoveryPanelProps> = ({
  errorState,
  onRetry,
  onRefresh,
  onOpenSettings,
  onReset,
  onDismiss,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!errorState.hasError || !errorState.currentError) {
    return null;
  }

  const error = errorState.currentError;
  const displayProps = getErrorDisplayProps(error);

  const getActionButton = (action: RecoveryAction) => {
    const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2";
    
    switch (action) {
      case 'retry':
        return (
          <button
            onClick={onRetry}
            disabled={errorState.isRetrying}
            className={`${baseClasses} bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400`}
          >
            <RefreshCw className={`h-4 w-4 ${errorState.isRetrying ? 'animate-spin' : ''}`} />
            <span>{errorState.isRetrying ? 'Retrying...' : 'Try Again'}</span>
          </button>
        );
      
      case 'refresh':
        return (
          <button
            onClick={onRefresh}
            className={`${baseClasses} bg-green-600 hover:bg-green-700 text-white`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Page</span>
          </button>
        );
      
      case 'settings':
        return (
          <button
            onClick={onOpenSettings}
            className={`${baseClasses} bg-gray-600 hover:bg-gray-700 text-white`}
          >
            <Settings className="h-4 w-4" />
            <span>Open Settings</span>
          </button>
        );
      
      case 'upgrade_browser':
        return (
          <a
            href="https://browsehappy.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClasses} bg-purple-600 hover:bg-purple-700 text-white`}
          >
            <Download className="h-4 w-4" />
            <span>Update Browser</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      
      case 'contact_support':
        return (
          <button
            onClick={() => {
              // In a real app, this would open a support dialog or email
              window.location.href = 'mailto:support@example.com?subject=Recording%20Issue';
            }}
            className={`${baseClasses} bg-indigo-600 hover:bg-indigo-700 text-white`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Contact Support</span>
          </button>
        );
      
      case 'manual_fix':
        return (
          <div className={`${baseClasses} bg-amber-100 text-amber-800 border border-amber-300`}>
            <AlertTriangle className="h-4 w-4" />
            <span>Manual action required</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getDetailedInstructions = (errorType: ErrorType): string[] => {
    const instructions: Record<ErrorType, string[]> = {
      permission_denied: [
        "Click the lock icon in your browser's address bar",
        "Find 'Microphone' in the permissions list",
        "Change the setting to 'Allow'",
        "Refresh this page and try again"
      ],
      permission_revoked: [
        "Your microphone permission was removed during recording",
        "Click the microphone icon in your browser's address bar",
        "Select 'Always allow' for this site",
        "Try recording again"
      ],
      browser_unsupported: [
        "Your browser doesn't support audio recording",
        "Download Chrome, Firefox, Safari, or Edge",
        "Make sure you're using the latest version",
        "Return to this page in the new browser"
      ],
      no_microphone: [
        "Connect a microphone to your device",
        "Check that it's properly plugged in",
        "Test it with other applications",
        "Try recording again once connected"
      ],
      microphone_busy: [
        "Close other applications that might be using your microphone",
        "Check for video calls, voice recorders, or streaming software",
        "Restart your browser if needed",
        "Try recording again"
      ],
      network_error: [
        "Check your internet connection",
        "Try refreshing the page",
        "Disable any VPN or proxy temporarily",
        "Contact your network administrator if on a corporate network"
      ],
      memory_error: [
        "Close other browser tabs to free up memory",
        "Close unnecessary applications",
        "Restart your browser",
        "Try recording shorter segments if the issue persists"
      ],
      codec_error: [
        "Update your browser to the latest version",
        "Try using a different browser",
        "Check if hardware acceleration is enabled in browser settings",
        "Contact support if the issue continues"
      ],
      initialization_error: [
        "Refresh the page to reset the recording system",
        "Check that your microphone is working in other applications",
        "Try using an incognito/private browsing window",
        "Clear your browser cache and cookies for this site"
      ],
      recording_error: [
        "Any partial recording may have been saved",
        "Try starting a new recording",
        "Check that your microphone is still connected",
        "Refresh the page if the problem continues"
      ],
      unknown_error: [
        "Try refreshing the page",
        "Check browser console for error details (F12 → Console)",
        "Try using a different browser",
        "Contact support with details about what you were doing"
      ]
    };
    
    return instructions[errorType] || [];
  };

  if (compact && !isExpanded) {
    return (
      <div className={`rounded-lg border p-3 ${displayProps.colorClasses}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error.message}</span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-current hover:opacity-75"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${displayProps.colorClasses}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <h3 className="font-semibold">{error.message}</h3>
            {error.details && (
              <p className="text-sm opacity-90 mt-1">{error.details}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-current hover:opacity-75"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
          {displayProps.canDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-current hover:opacity-75"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Retry Status */}
      {errorState.retryCount > 0 && (
        <div className="mb-3 p-2 bg-white/50 rounded border">
          <div className="flex items-center space-x-2 text-sm">
            {errorState.isRetrying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>
              Retry attempt {errorState.retryCount} of {error.maxRetries}
              {errorState.isRetrying ? ' in progress...' : ' failed'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {error.recoveryActions.map((action) => (
          <React.Fragment key={action}>
            {getActionButton(action)}
          </React.Fragment>
        ))}
        
        {/* Reset button for critical errors */}
        {error.severity === 'critical' && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Reset Application
          </button>
        )}
      </div>

      {/* Detailed Instructions */}
      <div className="border-t pt-3">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex items-center space-x-2 text-sm font-medium hover:opacity-75 mb-2"
        >
          {showTechnicalDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span>Detailed Instructions</span>
        </button>
        
        {showTechnicalDetails && (
          <div className="space-y-2">
            <ol className="text-sm space-y-1 pl-4">
              {getDetailedInstructions(error.type).map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="font-medium mr-2">{index + 1}.</span>
                  <span className="opacity-90">{instruction}</span>
                </li>
              ))}
            </ol>
            
            {/* Technical Details */}
            <div className="mt-3 p-2 bg-white/30 rounded text-xs font-mono">
              <div className="mb-1">
                <strong>Error Type:</strong> {error.type}
              </div>
              <div className="mb-1">
                <strong>Severity:</strong> {error.severity}
              </div>
              <div className="mb-1">
                <strong>Timestamp:</strong> {new Date(error.timestamp).toLocaleString()}
              </div>
              {errorState.retryCount > 0 && (
                <div>
                  <strong>Retry Count:</strong> {errorState.retryCount}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick recovery actions component for minimal UI
interface QuickRecoveryActionsProps {
  errorState: ErrorState;
  onRetry: () => void;
  onRefresh: () => void;
  onDismiss?: () => void;
}

export const QuickRecoveryActions: React.FC<QuickRecoveryActionsProps> = ({
  errorState,
  onRetry,
  onRefresh,
  onDismiss
}) => {
  if (!errorState.hasError || !errorState.currentError) {
    return null;
  }

  const error = errorState.currentError;
  const canRetry = error.recoveryActions.includes('retry');
  const canRefresh = error.recoveryActions.includes('refresh');

  return (
    <div className="flex items-center space-x-2">
      {canRetry && (
        <button
          onClick={onRetry}
          disabled={errorState.isRetrying}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-blue-400 flex items-center space-x-1"
        >
          <RefreshCw className={`h-3 w-3 ${errorState.isRetrying ? 'animate-spin' : ''}`} />
          <span>Retry</span>
        </button>
      )}
      
      {canRefresh && (
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center space-x-1"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Refresh</span>
        </button>
      )}
      
      {onDismiss && error.severity !== 'critical' && (
        <button
          onClick={onDismiss}
          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <XCircle className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};