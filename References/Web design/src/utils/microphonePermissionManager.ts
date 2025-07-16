import { useEffect, useState, useCallback, useRef } from 'react';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'checking' | 'unknown';
export type DenialType = 'temporary' | 'permanent' | 'unknown';

export interface PermissionStatus {
  state: PermissionState;
  denialType?: DenialType;
  isFirstTimeRequest: boolean;
  canRetry: boolean;
  lastChecked: Date;
}

export interface BrowserInstructions {
  browser: string;
  steps: string[];
  imageUrl?: string;
}

const PERMISSION_CHECK_INTERVAL = 1000; // Check every second when retrying
const MAX_RETRY_ATTEMPTS = 3;

export const detectBrowser = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edg') === -1) {
    return 'chrome';
  } else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
    return 'safari';
  } else if (userAgent.indexOf('firefox') > -1) {
    return 'firefox';
  } else if (userAgent.indexOf('edg') > -1) {
    return 'edge';
  }
  
  return 'unknown';
};

export const getBrowserPermissionInstructions = (): BrowserInstructions => {
  const browser = detectBrowser();
  
  const instructions: Record<string, BrowserInstructions> = {
    chrome: {
      browser: 'Chrome',
      steps: [
        'Click the lock or info icon in the address bar',
        'Find "Microphone" in the permissions list',
        'Change the setting to "Allow"',
        'Refresh the page and try recording again'
      ]
    },
    safari: {
      browser: 'Safari',
      steps: [
        'Go to Safari > Preferences > Websites',
        'Click on "Microphone" in the left sidebar',
        'Find this website in the list',
        'Change the dropdown to "Allow"',
        'Return to this page and try recording again'
      ]
    },
    firefox: {
      browser: 'Firefox',
      steps: [
        'Click the lock icon in the address bar',
        'Click the arrow next to "Connection secure"',
        'Click "More Information"',
        'Go to the "Permissions" tab',
        'Find "Use the Microphone" and uncheck "Use Default"',
        'Select "Allow" and close the dialog',
        'Refresh the page and try recording again'
      ]
    },
    edge: {
      browser: 'Edge',
      steps: [
        'Click the lock icon in the address bar',
        'Click "Permissions for this site"',
        'Find "Microphone" in the list',
        'Change the setting to "Allow"',
        'Refresh the page and try recording again'
      ]
    },
    unknown: {
      browser: 'your browser',
      steps: [
        'Look for a lock or info icon in the address bar',
        'Find microphone or site permissions',
        'Allow microphone access for this website',
        'Refresh the page and try recording again'
      ]
    }
  };
  
  return instructions[browser] || instructions.unknown;
};

export const checkMicrophonePermission = async (): Promise<PermissionStatus> => {
  const status: PermissionStatus = {
    state: 'checking',
    isFirstTimeRequest: false,
    canRetry: true,
    lastChecked: new Date()
  };

  try {
    // Try using the Permissions API if available
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        status.state = permissionStatus.state as PermissionState;
        
        // Determine if this is a permanent denial
        if (status.state === 'denied') {
          // Check if we've ever had access before (stored in localStorage)
          const hadAccessBefore = localStorage.getItem('mic_permission_granted') === 'true';
          status.denialType = hadAccessBefore ? 'permanent' : 'temporary';
          status.canRetry = status.denialType === 'temporary';
        }
        
        return status;
      } catch (e) {
        // Permissions API not fully supported, fall through to alternative method
      }
    }

    // Alternative method: Check if we've stored permission state
    const storedState = localStorage.getItem('mic_permission_state');
    if (storedState) {
      status.state = storedState as PermissionState;
      status.isFirstTimeRequest = false;
    } else {
      status.state = 'prompt';
      status.isFirstTimeRequest = true;
    }

    return status;
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    status.state = 'unknown';
    return status;
  }
};

export const requestMicrophonePermission = async (): Promise<{
  stream: MediaStream | null;
  error: Error | null;
  permissionStatus: PermissionStatus;
}> => {
  let stream: MediaStream | null = null;
  let error: Error | null = null;
  let permissionStatus: PermissionStatus;

  try {
    // Check current permission state first
    permissionStatus = await checkMicrophonePermission();
    
    if (permissionStatus.state === 'denied' && permissionStatus.denialType === 'permanent') {
      error = new Error('Microphone access is permanently denied');
      return { stream, error, permissionStatus };
    }

    // Attempt to get user media
    stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      } 
    });

    // Success - store permission state
    localStorage.setItem('mic_permission_state', 'granted');
    localStorage.setItem('mic_permission_granted', 'true');
    
    permissionStatus = await checkMicrophonePermission();
    
  } catch (err: any) {
    error = err;
    permissionStatus = await checkMicrophonePermission();
    
    // Analyze the error to determine denial type
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      // Check if this is the first denial
      const denialCount = parseInt(localStorage.getItem('mic_denial_count') || '0', 10);
      localStorage.setItem('mic_denial_count', String(denialCount + 1));
      
      if (denialCount >= MAX_RETRY_ATTEMPTS) {
        permissionStatus.denialType = 'permanent';
        permissionStatus.canRetry = false;
      } else {
        permissionStatus.denialType = 'temporary';
        permissionStatus.canRetry = true;
      }
      
      localStorage.setItem('mic_permission_state', 'denied');
    }
  }

  return { stream, error, permissionStatus };
};

export const cleanupMediaStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
};

export const useMicrophonePermission = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    state: 'unknown',
    isFirstTimeRequest: true,
    canRetry: true,
    lastChecked: new Date()
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const checkIntervalRef = useRef<number | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  const checkPermission = useCallback(async () => {
    const status = await checkMicrophonePermission();
    setPermissionStatus(status);
    return status;
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestMicrophonePermission();
    
    if (result.stream) {
      currentStreamRef.current = result.stream;
    }
    
    setPermissionStatus(result.permissionStatus);
    
    if (result.error && result.permissionStatus.canRetry) {
      setRetryCount(prev => prev + 1);
    }
    
    return result;
  }, []);

  const startPermissionMonitoring = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    checkIntervalRef.current = window.setInterval(async () => {
      const status = await checkPermission();
      
      // If permission state changed from denied to prompt/granted, notify
      if (permissionStatus.state === 'denied' && status.state !== 'denied') {
        setIsRetrying(false);
        clearInterval(checkIntervalRef.current!);
        checkIntervalRef.current = null;
      }
    }, PERMISSION_CHECK_INTERVAL);
  }, [checkPermission, permissionStatus.state]);

  const stopPermissionMonitoring = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  const resetPermissionState = useCallback(() => {
    localStorage.removeItem('mic_denial_count');
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const cleanup = useCallback(() => {
    stopPermissionMonitoring();
    cleanupMediaStream(currentStreamRef.current);
    currentStreamRef.current = null;
  }, [stopPermissionMonitoring]);

  // Monitor permission changes during recording
  const monitorPermissionDuringRecording = useCallback((onRevoked: () => void) => {
    const checkPermissionState = async () => {
      const status = await checkPermission();
      
      if (status.state === 'denied') {
        onRevoked();
        cleanup();
      }
    };

    // Check immediately
    checkPermissionState();

    // Set up periodic checks
    const intervalId = window.setInterval(checkPermissionState, PERMISSION_CHECK_INTERVAL * 5); // Check every 5 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [checkPermission, cleanup]);

  useEffect(() => {
    // Initial permission check
    checkPermission();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  return {
    permissionStatus,
    isRetrying,
    retryCount,
    checkPermission,
    requestPermission,
    startPermissionMonitoring,
    stopPermissionMonitoring,
    resetPermissionState,
    cleanup,
    monitorPermissionDuringRecording,
    maxRetries: MAX_RETRY_ATTEMPTS
  };
};