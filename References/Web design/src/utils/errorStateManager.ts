import { useCallback, useReducer, useEffect, useRef } from 'react';

export type ErrorType = 
  | 'permission_denied'
  | 'permission_revoked'
  | 'browser_unsupported'
  | 'no_microphone'
  | 'microphone_busy'
  | 'network_error'
  | 'memory_error'
  | 'codec_error'
  | 'initialization_error'
  | 'recording_error'
  | 'unknown_error';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RecoveryAction = 
  | 'retry'
  | 'refresh'
  | 'settings'
  | 'upgrade_browser'
  | 'contact_support'
  | 'manual_fix';

export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  recoveryActions: RecoveryAction[];
  isTransient: boolean;
  canAutoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  timestamp: number;
}

export interface ErrorState {
  hasError: boolean;
  currentError: ErrorInfo | null;
  errorHistory: ErrorInfo[];
  retryCount: number;
  isRetrying: boolean;
  lastRetryTime: number;
  canRecover: boolean;
}

type ErrorAction = 
  | { type: 'SET_ERROR'; error: ErrorInfo }
  | { type: 'CLEAR_ERROR' }
  | { type: 'START_RETRY' }
  | { type: 'RETRY_SUCCESS' }
  | { type: 'RETRY_FAILED' }
  | { type: 'RESET_STATE' };

const initialState: ErrorState = {
  hasError: false,
  currentError: null,
  errorHistory: [],
  retryCount: 0,
  isRetrying: false,
  lastRetryTime: 0,
  canRecover: true
};

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'SET_ERROR':
      return {
        ...state,
        hasError: true,
        currentError: action.error,
        errorHistory: [...state.errorHistory, action.error].slice(-10), // Keep last 10 errors
        canRecover: action.error.severity !== 'critical'
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        hasError: false,
        currentError: null,
        retryCount: 0,
        isRetrying: false
      };
    
    case 'START_RETRY':
      return {
        ...state,
        isRetrying: true,
        retryCount: state.retryCount + 1,
        lastRetryTime: Date.now()
      };
    
    case 'RETRY_SUCCESS':
      return {
        ...state,
        hasError: false,
        currentError: null,
        isRetrying: false,
        retryCount: 0
      };
    
    case 'RETRY_FAILED':
      return {
        ...state,
        isRetrying: false
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Error definitions with recovery information
export const ERROR_DEFINITIONS: Record<ErrorType, Omit<ErrorInfo, 'timestamp'>> = {
  permission_denied: {
    type: 'permission_denied',
    severity: 'high',
    message: 'Microphone permission denied',
    details: 'Please allow microphone access in your browser settings to record audio.',
    recoveryActions: ['settings', 'retry'],
    isTransient: true,
    canAutoRetry: false,
    maxRetries: 3,
    retryDelay: 2000
  },
  
  permission_revoked: {
    type: 'permission_revoked',
    severity: 'high',
    message: 'Microphone permission was revoked',
    details: 'Your microphone permission was removed during recording. Please re-enable it.',
    recoveryActions: ['settings', 'refresh'],
    isTransient: true,
    canAutoRetry: false,
    maxRetries: 2,
    retryDelay: 1000
  },
  
  browser_unsupported: {
    type: 'browser_unsupported',
    severity: 'critical',
    message: 'Browser not supported',
    details: 'Your browser does not support audio recording. Please use Chrome, Firefox, Safari, or Edge.',
    recoveryActions: ['upgrade_browser'],
    isTransient: false,
    canAutoRetry: false,
    maxRetries: 0,
    retryDelay: 0
  },
  
  no_microphone: {
    type: 'no_microphone',
    severity: 'high',
    message: 'No microphone found',
    details: 'Please connect a microphone to your device and try again.',
    recoveryActions: ['manual_fix', 'retry'],
    isTransient: true,
    canAutoRetry: true,
    maxRetries: 3,
    retryDelay: 3000
  },
  
  microphone_busy: {
    type: 'microphone_busy',
    severity: 'medium',
    message: 'Microphone is being used',
    details: 'Another application is using your microphone. Please close other apps and try again.',
    recoveryActions: ['manual_fix', 'retry'],
    isTransient: true,
    canAutoRetry: true,
    maxRetries: 5,
    retryDelay: 2000
  },
  
  network_error: {
    type: 'network_error',
    severity: 'medium',
    message: 'Network connection error',
    details: 'Unable to connect to recording services. Please check your internet connection.',
    recoveryActions: ['retry', 'refresh'],
    isTransient: true,
    canAutoRetry: true,
    maxRetries: 3,
    retryDelay: 5000
  },
  
  memory_error: {
    type: 'memory_error',
    severity: 'high',
    message: 'Insufficient memory',
    details: 'Your device is low on memory. Please close other tabs or applications.',
    recoveryActions: ['manual_fix', 'refresh'],
    isTransient: true,
    canAutoRetry: false,
    maxRetries: 1,
    retryDelay: 3000
  },
  
  codec_error: {
    type: 'codec_error',
    severity: 'high',
    message: 'Audio format not supported',
    details: 'Your browser does not support the required audio formats for recording.',
    recoveryActions: ['upgrade_browser', 'refresh'],
    isTransient: false,
    canAutoRetry: false,
    maxRetries: 1,
    retryDelay: 0
  },
  
  initialization_error: {
    type: 'initialization_error',
    severity: 'medium',
    message: 'Failed to initialize recording',
    details: 'Unable to set up the recording system. This may be a temporary issue.',
    recoveryActions: ['retry', 'refresh'],
    isTransient: true,
    canAutoRetry: true,
    maxRetries: 3,
    retryDelay: 2000
  },
  
  recording_error: {
    type: 'recording_error',
    severity: 'medium',
    message: 'Recording failed',
    details: 'An error occurred during recording. Your partial recording may have been saved.',
    recoveryActions: ['retry', 'refresh'],
    isTransient: true,
    canAutoRetry: true,
    maxRetries: 2,
    retryDelay: 1000
  },
  
  unknown_error: {
    type: 'unknown_error',
    severity: 'medium',
    message: 'An unexpected error occurred',
    details: 'Something went wrong. Please try again or refresh the page.',
    recoveryActions: ['retry', 'refresh', 'contact_support'],
    isTransient: true,
    canAutoRetry: true,
    maxRetries: 2,
    retryDelay: 3000
  }
};

export function useErrorState() {
  const [state, dispatch] = useReducer(errorReducer, initialState);
  const retryTimeoutRef = useRef<number | null>(null);
  const autoRetryEnabledRef = useRef(true);

  const setError = useCallback((errorType: ErrorType, customMessage?: string, customDetails?: string) => {
    const errorDef = ERROR_DEFINITIONS[errorType];
    const error: ErrorInfo = {
      ...errorDef,
      message: customMessage || errorDef.message,
      details: customDetails || errorDef.details,
      timestamp: Date.now()
    };
    
    dispatch({ type: 'SET_ERROR', error });
    
    // Auto-retry for transient errors if enabled
    if (error.canAutoRetry && autoRetryEnabledRef.current && state.retryCount < error.maxRetries) {
      scheduleAutoRetry(error.retryDelay);
    }
  }, [state.retryCount]);

  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const startRetry = useCallback(() => {
    dispatch({ type: 'START_RETRY' });
  }, []);

  const retrySuccess = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    dispatch({ type: 'RETRY_SUCCESS' });
  }, []);

  const retryFailed = useCallback(() => {
    dispatch({ type: 'RETRY_FAILED' });
    
    // Schedule another auto-retry if we haven't exceeded max retries
    if (state.currentError?.canAutoRetry && 
        autoRetryEnabledRef.current && 
        state.retryCount < (state.currentError?.maxRetries || 0)) {
      scheduleAutoRetry(state.currentError.retryDelay);
    }
  }, [state.currentError, state.retryCount]);

  const resetState = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const scheduleAutoRetry = useCallback((delay: number) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    retryTimeoutRef.current = window.setTimeout(() => {
      dispatch({ type: 'START_RETRY' });
    }, delay);
  }, []);

  const disableAutoRetry = useCallback(() => {
    autoRetryEnabledRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const enableAutoRetry = useCallback(() => {
    autoRetryEnabledRef.current = true;
  }, []);

  const canRetry = useCallback(() => {
    if (!state.currentError) return false;
    return state.retryCount < state.currentError.maxRetries;
  }, [state.currentError, state.retryCount]);

  const getRecoveryInstructions = useCallback((action: RecoveryAction): string => {
    const instructions: Record<RecoveryAction, string> = {
      retry: 'Click the retry button to try again.',
      refresh: 'Refresh the page to reset the application.',
      settings: 'Check your browser settings to allow microphone access.',
      upgrade_browser: 'Update your browser to the latest version or use a supported browser.',
      contact_support: 'If the problem persists, please contact our support team.',
      manual_fix: 'Please resolve the underlying issue and try again.'
    };
    
    return instructions[action];
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    errorState: state,
    setError,
    clearError,
    startRetry,
    retrySuccess,
    retryFailed,
    resetState,
    disableAutoRetry,
    enableAutoRetry,
    canRetry,
    getRecoveryInstructions
  };
}

// Utility functions for error handling
export function mapErrorToType(error: Error | string): ErrorType {
  const errorMessage = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();
  
  if (errorMessage.includes('permission') || errorMessage.includes('notallowed')) {
    return 'permission_denied';
  } else if (errorMessage.includes('notfound') || errorMessage.includes('no device')) {
    return 'no_microphone';
  } else if (errorMessage.includes('notreadable') || errorMessage.includes('busy')) {
    return 'microphone_busy';
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'network_error';
  } else if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
    return 'memory_error';
  } else if (errorMessage.includes('codec') || errorMessage.includes('format')) {
    return 'codec_error';
  } else if (errorMessage.includes('initialization') || errorMessage.includes('initialize')) {
    return 'initialization_error';
  } else if (errorMessage.includes('recording')) {
    return 'recording_error';
  }
  
  return 'unknown_error';
}

export function shouldShowErrorUI(errorState: ErrorState): boolean {
  return errorState.hasError && errorState.currentError !== null;
}

export function getErrorDisplayProps(error: ErrorInfo) {
  const severityColors = {
    low: 'text-blue-600 bg-blue-50 border-blue-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    high: 'text-red-600 bg-red-50 border-red-200',
    critical: 'text-red-700 bg-red-100 border-red-300'
  };
  
  return {
    colorClasses: severityColors[error.severity],
    canDismiss: error.severity !== 'critical',
    showRetry: error.recoveryActions.includes('retry'),
    showSettings: error.recoveryActions.includes('settings'),
    showRefresh: error.recoveryActions.includes('refresh')
  };
}