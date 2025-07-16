import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  MicOff, 
  WifiOff, 
  HardDrive,
  Download,
  Settings,
  Smartphone,
  Monitor
} from 'lucide-react';
import { ErrorType } from '../utils/errorStateManager';

interface FallbackUIProps {
  errorType: ErrorType;
  onRetry?: () => void;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  isRetrying?: boolean;
}

export const FallbackUI: React.FC<FallbackUIProps> = ({
  errorType,
  onRetry,
  onRefresh,
  onOpenSettings,
  isRetrying = false
}) => {
  const getFallbackContent = () => {
    switch (errorType) {
      case 'permission_denied':
      case 'permission_revoked':
        return (
          <PermissionDeniedFallback 
            onRetry={onRetry}
            onOpenSettings={onOpenSettings}
            isRetrying={isRetrying}
          />
        );
      
      case 'browser_unsupported':
        return <BrowserUnsupportedFallback />;
      
      case 'no_microphone':
        return (
          <NoMicrophoneFallback 
            onRetry={onRetry}
            isRetrying={isRetrying}
          />
        );
      
      case 'network_error':
        return (
          <NetworkErrorFallback 
            onRetry={onRetry}
            onRefresh={onRefresh}
            isRetrying={isRetrying}
          />
        );
      
      case 'memory_error':
        return (
          <MemoryErrorFallback 
            onRefresh={onRefresh}
            isRetrying={isRetrying}
          />
        );
      
      case 'microphone_busy':
        return (
          <MicrophoneBusyFallback 
            onRetry={onRetry}
            isRetrying={isRetrying}
          />
        );
      
      default:
        return (
          <GenericErrorFallback 
            onRetry={onRetry}
            onRefresh={onRefresh}
            isRetrying={isRetrying}
          />
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      {getFallbackContent()}
    </div>
  );
};

// Specific fallback components for different error types

const PermissionDeniedFallback: React.FC<{
  onRetry?: () => void;
  onOpenSettings?: () => void;
  isRetrying?: boolean;
}> = ({ onRetry, onOpenSettings, isRetrying }) => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
      <MicOff className="h-10 w-10 text-red-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Microphone Access Required
    </h3>
    
    <p className="text-gray-600 mb-6">
      We need permission to access your microphone to record conversations. 
      Please allow microphone access in your browser settings.
    </p>
    
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
        <h4 className="font-medium text-blue-900 mb-2">Quick Fix:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Click the lock icon in your address bar</li>
          <li>2. Set microphone to "Allow"</li>
          <li>3. Refresh the page</li>
        </ol>
      </div>
      
      <div className="flex space-x-3 justify-center">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Open Settings</span>
          </button>
        )}
        
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center space-x-2 disabled:bg-green-400"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Try Again'}</span>
          </button>
        )}
      </div>
    </div>
  </div>
);

const BrowserUnsupportedFallback: React.FC = () => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
      <AlertTriangle className="h-10 w-10 text-amber-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Browser Not Supported
    </h3>
    
    <p className="text-gray-600 mb-6">
      Your browser doesn't support audio recording. Please use a modern browser 
      for the best experience.
    </p>
    
    <div className="grid grid-cols-2 gap-3 mb-6">
      {[
        { name: 'Chrome', url: 'https://www.google.com/chrome/' },
        { name: 'Firefox', url: 'https://www.mozilla.org/firefox/' },
        { name: 'Safari', url: 'https://www.apple.com/safari/' },
        { name: 'Edge', url: 'https://www.microsoft.com/edge' }
      ].map((browser) => (
        <a
          key={browser.name}
          href={browser.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4 text-gray-600" />
          <span className="font-medium">{browser.name}</span>
        </a>
      ))}
    </div>
    
    <p className="text-sm text-gray-500">
      Make sure to use the latest version for best compatibility
    </p>
  </div>
);

const NoMicrophoneFallback: React.FC<{
  onRetry?: () => void;
  isRetrying?: boolean;
}> = ({ onRetry, isRetrying }) => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      <MicOff className="h-10 w-10 text-gray-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      No Microphone Detected
    </h3>
    
    <p className="text-gray-600 mb-6">
      We couldn't find a microphone connected to your device. Please connect 
      a microphone and try again.
    </p>
    
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left mb-6">
      <h4 className="font-medium text-gray-900 mb-2">Troubleshooting:</h4>
      <ul className="text-sm text-gray-700 space-y-1">
        <li>• Check that your microphone is properly connected</li>
        <li>• Test your microphone with other applications</li>
        <li>• Try using built-in microphone if available</li>
        <li>• Check device audio settings</li>
      </ul>
    </div>
    
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2 mx-auto disabled:bg-blue-400"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Checking...' : 'Check Again'}</span>
      </button>
    )}
  </div>
);

const NetworkErrorFallback: React.FC<{
  onRetry?: () => void;
  onRefresh?: () => void;
  isRetrying?: boolean;
}> = ({ onRetry, onRefresh, isRetrying }) => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
      <WifiOff className="h-10 w-10 text-red-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Connection Problem
    </h3>
    
    <p className="text-gray-600 mb-6">
      We're having trouble connecting to our recording services. Please check 
      your internet connection and try again.
    </p>
    
    <div className="flex space-x-3 justify-center">
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2 disabled:bg-blue-400"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
        </button>
      )}
      
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      )}
    </div>
  </div>
);

const MemoryErrorFallback: React.FC<{
  onRefresh?: () => void;
  isRetrying?: boolean;
}> = ({ onRefresh, isRetrying }) => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
      <HardDrive className="h-10 w-10 text-amber-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Memory Limit Reached
    </h3>
    
    <p className="text-gray-600 mb-6">
      Your device is running low on memory. Please close some browser tabs 
      or applications to free up memory.
    </p>
    
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-6">
      <h4 className="font-medium text-amber-900 mb-2">To free up memory:</h4>
      <ul className="text-sm text-amber-800 space-y-1">
        <li>• Close unused browser tabs</li>
        <li>• Quit other applications</li>
        <li>• Clear browser cache</li>
        <li>• Restart your browser</li>
      </ul>
    </div>
    
    {onRefresh && (
      <button
        onClick={onRefresh}
        disabled={isRetrying}
        className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center space-x-2 mx-auto disabled:bg-amber-400"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>Refresh Page</span>
      </button>
    )}
  </div>
);

const MicrophoneBusyFallback: React.FC<{
  onRetry?: () => void;
  isRetrying?: boolean;
}> = ({ onRetry, isRetrying }) => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
      <MicOff className="h-10 w-10 text-yellow-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Microphone In Use
    </h3>
    
    <p className="text-gray-600 mb-6">
      Another application is currently using your microphone. Please close 
      other apps that might be using it and try again.
    </p>
    
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
      <h4 className="font-medium text-yellow-900 mb-2">Common culprits:</h4>
      <ul className="text-sm text-yellow-800 space-y-1">
        <li>• Video calling apps (Zoom, Teams, Skype)</li>
        <li>• Voice recording software</li>
        <li>• Other browser tabs with microphone access</li>
        <li>• Streaming or broadcasting software</li>
      </ul>
    </div>
    
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium flex items-center space-x-2 mx-auto disabled:bg-yellow-400"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Checking...' : 'Try Again'}</span>
      </button>
    )}
  </div>
);

const GenericErrorFallback: React.FC<{
  onRetry?: () => void;
  onRefresh?: () => void;
  isRetrying?: boolean;
}> = ({ onRetry, onRefresh, isRetrying }) => (
  <div className="text-center max-w-md">
    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      <AlertTriangle className="h-10 w-10 text-gray-600" />
    </div>
    
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Something Went Wrong
    </h3>
    
    <p className="text-gray-600 mb-6">
      We encountered an unexpected error. This is usually temporary and 
      can be resolved by trying again.
    </p>
    
    <div className="flex space-x-3 justify-center">
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2 disabled:bg-blue-400"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Trying...' : 'Try Again'}</span>
        </button>
      )}
      
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      )}
    </div>
    
    <p className="text-sm text-gray-500 mt-4">
      If the problem persists, try refreshing the page or contact support
    </p>
  </div>
);

// Responsive fallback wrapper that adapts to device type
export const ResponsiveFallbackUI: React.FC<FallbackUIProps & {
  isMobile?: boolean;
}> = ({ isMobile, ...props }) => {
  const Icon = isMobile ? Smartphone : Monitor;
  
  return (
    <div className={`w-full ${isMobile ? 'px-4' : 'px-8'}`}>
      <div className="flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">
          {isMobile ? 'Mobile' : 'Desktop'} Experience
        </span>
      </div>
      <FallbackUI {...props} />
    </div>
  );
};