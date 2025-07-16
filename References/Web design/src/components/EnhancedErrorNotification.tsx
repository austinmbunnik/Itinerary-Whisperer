import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { DetailedUploadError, RecoveryOption } from '../utils/enhancedUploadService';

export interface EnhancedNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'upload_error';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  error?: DetailedUploadError;
  recoveryOptions?: RecoveryOption[];
  onRecoveryAction?: (action: RecoveryOption['action'], option: RecoveryOption) => void;
  onDismiss?: () => void;
  timestamp: number;
}

interface EnhancedNotificationContextType {
  notifications: EnhancedNotification[];
  showNotification: (notification: Omit<EnhancedNotification, 'id' | 'timestamp'>) => string;
  showSuccess: (title: string, message: string, duration?: number) => string;
  showWarning: (title: string, message: string, duration?: number) => string;
  showError: (title: string, message: string, duration?: number) => string;
  showInfo: (title: string, message: string, duration?: number) => string;
  showUploadError: (
    error: DetailedUploadError, 
    onRecoveryAction?: (action: RecoveryOption['action'], option: RecoveryOption) => void
  ) => string;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

const EnhancedNotificationContext = createContext<EnhancedNotificationContextType | undefined>(undefined);

export const useEnhancedNotifications = () => {
  const context = useContext(EnhancedNotificationContext);
  if (!context) {
    throw new Error('useEnhancedNotifications must be used within EnhancedNotificationProvider');
  }
  return context;
};

export const EnhancedNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);

  const generateId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const showNotification = useCallback((notification: Omit<EnhancedNotification, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newNotification: EnhancedNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss non-persistent notifications
    if (!notification.persistent && notification.duration !== 0) {
      const duration = notification.duration || (notification.type === 'error' ? 8000 : 5000);
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const showSuccess = useCallback((title: string, message: string, duration = 5000) => {
    return showNotification({ type: 'success', title, message, duration });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, duration = 6000) => {
    return showNotification({ type: 'warning', title, message, duration });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, duration = 8000) => {
    return showNotification({ type: 'error', title, message, duration });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, duration = 5000) => {
    return showNotification({ type: 'info', title, message, duration });
  }, [showNotification]);

  const showUploadError = useCallback((
    error: DetailedUploadError, 
    onRecoveryAction?: (action: RecoveryOption['action'], option: RecoveryOption) => void
  ) => {
    return showNotification({
      type: 'upload_error',
      title: `Upload ${error.retryable ? 'Issue' : 'Failed'}`,
      message: error.userFriendlyMessage,
      persistent: true, // Upload errors should be persistent
      error,
      recoveryOptions: error.recoveryOptions,
      onRecoveryAction
    });
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: EnhancedNotificationContextType = {
    notifications,
    showNotification,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    showUploadError,
    dismissNotification,
    clearAll
  };

  return (
    <EnhancedNotificationContext.Provider value={value}>
      {children}
      <EnhancedNotificationContainer 
        notifications={notifications} 
        onDismiss={dismissNotification}
      />
    </EnhancedNotificationContext.Provider>
  );
};

interface EnhancedNotificationContainerProps {
  notifications: EnhancedNotification[];
  onDismiss: (id: string) => void;
}

const EnhancedNotificationContainer: React.FC<EnhancedNotificationContainerProps> = ({
  notifications,
  onDismiss
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <EnhancedNotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}
    </div>
  );
};

interface EnhancedNotificationCardProps {
  notification: EnhancedNotification;
  onDismiss: () => void;
}

const EnhancedNotificationCard: React.FC<EnhancedNotificationCardProps> = ({
  notification,
  onDismiss
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
      case 'upload_error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'error':
      case 'upload_error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleRecoveryAction = async (option: RecoveryOption) => {
    setSelectedAction(option.id);
    setIsRetrying(true);

    try {
      if (notification.onRecoveryAction) {
        await notification.onRecoveryAction(option.action, option);
      }
    } finally {
      setIsRetrying(false);
      setSelectedAction(null);
      
      // Dismiss notification after successful recovery action
      if (option.action === 'retry' || option.action === 'refresh_page') {
        onDismiss();
      }
    }
  };

  const primaryOption = notification.recoveryOptions?.find(option => option.primary);
  const secondaryOptions = notification.recoveryOptions?.filter(option => !option.primary) || [];

  return (
    <div className={`border rounded-lg shadow-lg p-4 ${getBackgroundColor()} animate-slide-in-right`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {notification.title}
          </h3>
          <p className="text-sm text-gray-700 mt-1">
            {notification.message}
          </p>
          
          {notification.error?.suggestedAction && (
            <div className="mt-2 p-2 bg-white rounded border-l-4 border-blue-400">
              <p className="text-xs text-blue-800">
                <strong>Suggestion:</strong> {notification.error.suggestedAction}
              </p>
            </div>
          )}

          {/* Recovery Actions for Upload Errors */}
          {notification.type === 'upload_error' && notification.recoveryOptions && (
            <div className="mt-3 space-y-2">
              {/* Primary Action */}
              {primaryOption && (
                <button
                  onClick={() => handleRecoveryAction(primaryOption)}
                  disabled={isRetrying && selectedAction === primaryOption.id}
                  className={`
                    w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md
                    transition-all duration-200
                    ${isRetrying && selectedAction === primaryOption.id
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                      {primaryOption.label}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              )}

              {/* Secondary Actions */}
              {secondaryOptions.length > 0 && (
                <div className="space-y-1">
                  {secondaryOptions.slice(0, 2).map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleRecoveryAction(option)}
                      disabled={isRetrying && selectedAction === option.id}
                      className={`
                        w-full flex items-center justify-between px-3 py-1.5 text-xs
                        border border-gray-300 rounded-md
                        transition-all duration-200
                        ${isRetrying && selectedAction === option.id
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-white hover:bg-gray-50 text-gray-700'
                        }
                      `}
                    >
                      <span>{option.label}</span>
                      {isRetrying && selectedAction === option.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : option.action === 'contact_support' ? (
                        <ExternalLink className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Category Badge */}
          {notification.error && (
            <div className="mt-2 flex items-center space-x-2">
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${notification.error.retryable 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-red-100 text-red-800'
                }
              `}>
                {notification.error.category} error
                {notification.error.retryable && ' • retryable'}
              </span>
            </div>
          )}
        </div>
        
        {/* Close Button */}
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// CSS for animations (add to your global CSS)
export const notificationStyles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`;