export interface RecordingError {
  type: 'permission' | 'browser_support' | 'network' | 'file_size' | 'duration' | 'generic';
  code?: string;
  message: string;
  suggestion: string;
}

export const RECORDING_ERRORS: Record<string, RecordingError> = {
  // Permission-related errors
  PERMISSION_DENIED: {
    type: 'permission',
    code: 'NotAllowedError',
    message: 'Microphone access denied',
    suggestion: 'Please allow microphone access in your browser settings and try again.'
  },
  
  PERMISSION_DISMISSED: {
    type: 'permission',
    code: 'NotAllowedError',
    message: 'Permission request was dismissed',
    suggestion: 'Click the microphone icon in your browser address bar to grant permission.'
  },

  // Browser support errors
  NO_MEDIA_DEVICES: {
    type: 'browser_support',
    message: 'Browser does not support audio recording',
    suggestion: 'Please use a modern browser like Chrome, Firefox, or Safari.'
  },

  NO_USER_MEDIA: {
    type: 'browser_support',
    message: 'getUserMedia not supported',
    suggestion: 'Please update your browser or use a different browser that supports audio recording.'
  },

  // Hardware-related errors
  NO_MICROPHONE: {
    type: 'browser_support',
    code: 'NotFoundError',
    message: 'No microphone found',
    suggestion: 'Please connect a microphone and try again.'
  },

  MICROPHONE_BUSY: {
    type: 'permission',
    code: 'NotReadableError',
    message: 'Microphone is being used by another application',
    suggestion: 'Close other applications using the microphone and try again.'
  },

  // Recording constraints errors
  CONSTRAINTS_NOT_SATISFIED: {
    type: 'browser_support',
    code: 'OverconstrainedError',
    message: 'Audio recording constraints cannot be satisfied',
    suggestion: 'Your microphone may not support the required audio quality. Try using a different microphone.'
  },

  // Network-related errors
  UPLOAD_FAILED: {
    type: 'network',
    message: 'Failed to upload recording',
    suggestion: 'Check your internet connection and try again.'
  },

  TRANSCRIPTION_FAILED: {
    type: 'network',
    message: 'Transcription service unavailable',
    suggestion: 'Our transcription service is temporarily unavailable. Please try again in a few minutes.'
  },

  // File size and duration errors
  FILE_TOO_LARGE: {
    type: 'file_size',
    message: 'Recording file is too large',
    suggestion: 'Please record shorter segments or check your audio quality settings.'
  },

  RECORDING_TOO_LONG: {
    type: 'duration',
    message: 'Recording exceeded maximum duration',
    suggestion: 'Maximum recording time is 60 minutes. Please record shorter segments.'
  },

  RECORDING_TOO_SHORT: {
    type: 'duration',
    message: 'Recording is too short to process',
    suggestion: 'Please record at least 5 seconds of audio.'
  },

  // Generic errors
  UNKNOWN_ERROR: {
    type: 'generic',
    message: 'An unexpected error occurred',
    suggestion: 'Please try again or refresh the page. If the problem persists, contact support.'
  },

  RECORDING_START_FAILED: {
    type: 'generic',
    message: 'Failed to start recording',
    suggestion: 'Please try again. If the problem persists, refresh the page.'
  },

  RECORDING_STOP_FAILED: {
    type: 'generic',
    message: 'Failed to stop recording properly',
    suggestion: 'Your recording may not have been saved. Please try recording again.'
  }
};

export const getRecordingErrorFromException = (error: any): RecordingError => {
  if (error?.name || error?.code) {
    const errorCode = error.name || error.code;
    
    switch (errorCode) {
      case 'NotAllowedError':
        return RECORDING_ERRORS.PERMISSION_DENIED;
      case 'NotFoundError':
        return RECORDING_ERRORS.NO_MICROPHONE;
      case 'NotReadableError':
        return RECORDING_ERRORS.MICROPHONE_BUSY;
      case 'OverconstrainedError':
        return RECORDING_ERRORS.CONSTRAINTS_NOT_SATISFIED;
      case 'SecurityError':
        return RECORDING_ERRORS.PERMISSION_DENIED;
      default:
        return RECORDING_ERRORS.UNKNOWN_ERROR;
    }
  }

  if (error?.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      return RECORDING_ERRORS.PERMISSION_DENIED;
    }
    
    if (message.includes('not found') || message.includes('no device')) {
      return RECORDING_ERRORS.NO_MICROPHONE;
    }
    
    if (message.includes('not supported') || message.includes('not available')) {
      return RECORDING_ERRORS.NO_MEDIA_DEVICES;
    }
  }

  return RECORDING_ERRORS.UNKNOWN_ERROR;
};

export const isRecordingSupported = (): boolean => {
  return !!(
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  );
};

export const checkRecordingConstraints = async (): Promise<{ supported: boolean; error?: RecordingError }> => {
  if (!isRecordingSupported()) {
    return {
      supported: false,
      error: RECORDING_ERRORS.NO_MEDIA_DEVICES
    };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudioInput = devices.some(device => device.kind === 'audioinput');
    
    if (!hasAudioInput) {
      return {
        supported: false,
        error: RECORDING_ERRORS.NO_MICROPHONE
      };
    }

    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      error: getRecordingErrorFromException(error)
    };
  }
};