import { useState } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Server, 
  FileX, 
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { DetailedUploadError, RecoveryOption } from '../utils/enhancedUploadService';

interface UploadErrorRecoveryProps {
  error: DetailedUploadError;
  onRecoveryAction: (action: RecoveryOption['action'], option: RecoveryOption) => void;
  isRetrying?: boolean;
  retryCount?: number;
  className?: string;
}

export const UploadErrorRecovery = ({
  error,
  onRecoveryAction,
  isRetrying = false,
  retryCount = 0,
  className = ''
}: UploadErrorRecoveryProps) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const getErrorIcon = () => {
    switch (error.category) {
      case 'network':
        return error.type === 'network_offline' ? 
          <WifiOff className="h-6 w-6 text-red-500" /> :
          <Wifi className="h-6 w-6 text-amber-500" />;
      case 'server':
        return <Server className="h-6 w-6 text-red-500" />;
      case 'validation':
        return <FileX className="h-6 w-6 text-red-500" />;
      case 'client':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'session':
        return <Clock className="h-6 w-6 text-amber-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getErrorSeverityColor = () => {
    if (!error.retryable) return 'border-red-500 bg-red-50';
    if (error.autoRetryable) return 'border-amber-500 bg-amber-50';
    return 'border-blue-500 bg-blue-50';
  };

  const handleRecoveryAction = (option: RecoveryOption) => {
    setSelectedAction(option.id);
    onRecoveryAction(option.action, option);
  };

  const primaryOption = error.recoveryOptions.find(option => option.primary);
  const secondaryOptions = error.recoveryOptions.filter(option => !option.primary);

  return (
    <div className={`border-2 rounded-lg p-4 ${getErrorSeverityColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload {error.retryable ? 'Issue' : 'Failed'}
            </h3>
            {retryCount > 0 && (
              <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                Attempt #{retryCount + 1}
              </span>
            )}
          </div>
          
          <p className="text-gray-700 mb-3">
            {error.userFriendlyMessage}
          </p>
          
          {error.suggestedAction && (
            <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-400">
              <p className="text-sm text-gray-700">
                <strong>Suggested action:</strong> {error.suggestedAction}
              </p>
            </div>
          )}

          {/* Primary Recovery Action */}
          {primaryOption && (
            <div className="mb-4">
              <button
                onClick={() => handleRecoveryAction(primaryOption)}
                disabled={isRetrying && selectedAction === primaryOption.id}
                className={`
                  w-full flex items-center justify-center px-4 py-3 rounded-md font-medium
                  transition-all duration-200
                  ${isRetrying && selectedAction === primaryOption.id
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : error.retryable
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }
                `}
              >
                {isRetrying && selectedAction === primaryOption.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    {primaryOption.action === 'retry' && <RefreshCw className="h-4 w-4 mr-2" />}
                    {primaryOption.action === 'check_connection' && <Wifi className="h-4 w-4 mr-2" />}
                    {primaryOption.action === 'refresh_page' && <RefreshCw className="h-4 w-4 mr-2" />}
                    {primaryOption.label}
                  </>
                )}
              </button>
              <p className="text-xs text-gray-600 mt-1 text-center">
                {primaryOption.description}
              </p>
            </div>
          )}

          {/* Secondary Recovery Options */}
          {secondaryOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Other options:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {secondaryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleRecoveryAction(option)}
                    disabled={isRetrying && selectedAction === option.id}
                    className={`
                      flex items-center justify-between px-3 py-2 text-sm
                      border border-gray-300 rounded-md
                      transition-all duration-200
                      ${isRetrying && selectedAction === option.id
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-400'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      {option.action === 'retry_with_smaller_chunks' && <FileX className="h-4 w-4 mr-2" />}
                      {option.action === 'retry_without_chunks' && <FileX className="h-4 w-4 mr-2" />}
                      {option.action === 'check_connection' && <Wifi className="h-4 w-4 mr-2" />}
                      {option.action === 'refresh_page' && <RefreshCw className="h-4 w-4 mr-2" />}
                      {option.action === 'contact_support' && <HelpCircle className="h-4 w-4 mr-2" />}
                      {option.action === 'try_different_file' && <FileX className="h-4 w-4 mr-2" />}
                      <span>{option.label}</span>
                    </div>
                    {isRetrying && selectedAction === option.id && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                    {option.action === 'contact_support' && (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Categories Info */}
          <div className="mt-4 p-3 bg-white rounded border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Error Details</span>
                {error.retryable ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" title="Retryable error" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" title="Non-retryable error" />
                )}
              </div>
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                {showTechnicalDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show details
                  </>
                )}
              </button>
            </div>
            
            {showTechnicalDetails && (
              <div className="mt-3 space-y-2">
                <div className="text-xs">
                  <span className="font-medium text-gray-600">Type:</span>
                  <span className="ml-2 text-gray-500">{error.type}</span>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-gray-600">Category:</span>
                  <span className="ml-2 text-gray-500">{error.category}</span>
                </div>
                {error.statusCode && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Status Code:</span>
                    <span className="ml-2 text-gray-500">{error.statusCode}</span>
                  </div>
                )}
                {error.technicalDetails && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Technical Details:</span>
                    <div className="ml-2 text-gray-500 bg-gray-100 p-2 rounded mt-1 font-mono">
                      {error.technicalDetails}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface UploadStatusIndicatorProps {
  error?: DetailedUploadError | null;
  isRetrying?: boolean;
  retryCount?: number;
  className?: string;
}

export const UploadStatusIndicator = ({
  error,
  isRetrying = false,
  retryCount = 0,
  className = ''
}: UploadStatusIndicatorProps) => {
  if (!error) return null;

  const getStatusColor = () => {
    if (isRetrying) return 'bg-blue-100 border-blue-400 text-blue-800';
    if (!error.retryable) return 'bg-red-100 border-red-400 text-red-800';
    return 'bg-amber-100 border-amber-400 text-amber-800';
  };

  return (
    <div className={`border-l-4 p-3 ${getStatusColor()} ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {isRetrying ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : error.retryable ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">
            {isRetrying 
              ? `Retrying upload (attempt #${retryCount + 1})...`
              : error.retryable
                ? 'Upload temporarily failed'
                : 'Upload failed'
            }
          </p>
          <p className="text-xs mt-1">
            {error.userFriendlyMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

interface ConnectionStatusProps {
  isOnline: boolean;
  className?: string;
}

export const ConnectionStatus = ({ isOnline, className = '' }: ConnectionStatusProps) => {
  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600">No connection</span>
        </>
      )}
    </div>
  );
};