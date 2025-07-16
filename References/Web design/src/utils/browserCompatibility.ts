export interface BrowserInfo {
  name: string;
  version: string;
  majorVersion: number;
  isSupported: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  platform: string;
  userAgent: string;
}

export interface BrowserRequirements {
  chrome: number;
  firefox: number;
  safari: number;
  edge: number;
  opera: number;
  iosSafari: number;
  androidChrome: number;
}

export interface CodecSupport {
  format: string;
  codec: string;
  mimeType: string;
  isSupported: boolean;
  priority: number;
}

export interface RecordingCapabilities {
  hasMediaRecorder: boolean;
  hasGetUserMedia: boolean;
  supportedCodecs: CodecSupport[];
  preferredCodec: CodecSupport | null;
  hasMobileConstraints: boolean;
  requiresUserGesture: boolean;
  maxSampleRate: number;
  supportedChannels: number;
}

// Minimum supported browser versions
export const MINIMUM_BROWSER_VERSIONS: BrowserRequirements = {
  chrome: 49,
  firefox: 25,
  safari: 14.1,
  edge: 79,
  opera: 36,
  iosSafari: 14.5,
  androidChrome: 49
};

// Audio codec configurations in priority order
export const AUDIO_CODECS: CodecSupport[] = [
  {
    format: 'webm',
    codec: 'opus',
    mimeType: 'audio/webm;codecs=opus',
    isSupported: false,
    priority: 1
  },
  {
    format: 'webm',
    codec: 'vorbis',
    mimeType: 'audio/webm;codecs=vorbis',
    isSupported: false,
    priority: 2
  },
  {
    format: 'mp4',
    codec: 'aac',
    mimeType: 'audio/mp4',
    isSupported: false,
    priority: 3
  },
  {
    format: 'ogg',
    codec: 'opus',
    mimeType: 'audio/ogg;codecs=opus',
    isSupported: false,
    priority: 4
  },
  {
    format: 'wav',
    codec: 'pcm',
    mimeType: 'audio/wav',
    isSupported: false,
    priority: 5
  }
];

export function detectBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  // Detect mobile platforms
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 0);
  const isAndroid = /android/i.test(userAgent);
  
  let browserName = 'unknown';
  let version = '0';
  let majorVersion = 0;
  
  // Detect browser and version
  if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edg') === -1 && userAgent.indexOf('opr') === -1) {
    browserName = isAndroid ? 'androidChrome' : 'chrome';
    const match = userAgent.match(/chrome\/(\d+\.?\d*)/);
    if (match) version = match[1];
  } else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
    browserName = isIOS ? 'iosSafari' : 'safari';
    const match = userAgent.match(/version\/(\d+\.?\d*)/);
    if (match) version = match[1];
  } else if (userAgent.indexOf('firefox') > -1) {
    browserName = 'firefox';
    const match = userAgent.match(/firefox\/(\d+\.?\d*)/);
    if (match) version = match[1];
  } else if (userAgent.indexOf('edg') > -1) {
    browserName = 'edge';
    const match = userAgent.match(/edg\/(\d+\.?\d*)/);
    if (match) version = match[1];
  } else if (userAgent.indexOf('opr') > -1 || userAgent.indexOf('opera') > -1) {
    browserName = 'opera';
    const match = userAgent.match(/(?:opr|opera)\/(\d+\.?\d*)/);
    if (match) version = match[1];
  }
  
  majorVersion = parseInt(version.split('.')[0], 10) || 0;
  
  // Check if browser version meets minimum requirements
  const minVersion = MINIMUM_BROWSER_VERSIONS[browserName as keyof BrowserRequirements] || 999;
  const isSupported = majorVersion >= minVersion;
  
  return {
    name: browserName,
    version,
    majorVersion,
    isSupported,
    isMobile,
    isIOS,
    isAndroid,
    platform,
    userAgent: navigator.userAgent
  };
}

export async function detectCodecSupport(): Promise<CodecSupport[]> {
  if (!window.MediaRecorder) {
    return [];
  }
  
  const supportedCodecs = await Promise.all(
    AUDIO_CODECS.map(async (codec) => {
      try {
        const isSupported = MediaRecorder.isTypeSupported(codec.mimeType);
        return {
          ...codec,
          isSupported
        };
      } catch {
        return {
          ...codec,
          isSupported: false
        };
      }
    })
  );
  
  return supportedCodecs.filter(codec => codec.isSupported);
}

export async function getRecordingCapabilities(): Promise<RecordingCapabilities> {
  const browserInfo = detectBrowserInfo();
  const supportedCodecs = await detectCodecSupport();
  const preferredCodec = supportedCodecs.sort((a, b) => a.priority - b.priority)[0] || null;
  
  const capabilities: RecordingCapabilities = {
    hasMediaRecorder: typeof window.MediaRecorder !== 'undefined',
    hasGetUserMedia: !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'),
    supportedCodecs,
    preferredCodec,
    hasMobileConstraints: browserInfo.isMobile,
    requiresUserGesture: browserInfo.isIOS,
    maxSampleRate: browserInfo.isIOS ? 48000 : 44100,
    supportedChannels: browserInfo.isMobile ? 1 : 2
  };
  
  return capabilities;
}

export function getMobileConstraints(browserInfo: BrowserInfo): MediaTrackConstraints {
  const baseConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };
  
  if (browserInfo.isIOS) {
    // iOS Safari specific constraints
    return {
      ...baseConstraints,
      sampleRate: 48000,
      channelCount: 1,
      // iOS doesn't support some constraints
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true }
    };
  } else if (browserInfo.isAndroid) {
    // Android Chrome specific constraints
    return {
      ...baseConstraints,
      sampleRate: { ideal: 44100 },
      channelCount: { ideal: 1 },
      // Android supports more granular control
      echoCancellation: { ideal: true, exact: false },
      noiseSuppression: { ideal: true, exact: false },
      autoGainControl: { ideal: true, exact: false }
    };
  }
  
  // Desktop constraints
  return {
    ...baseConstraints,
    sampleRate: { ideal: 44100 },
    channelCount: { ideal: 2, max: 2 }
  };
}

export function getBrowserUpgradeMessage(browserInfo: BrowserInfo): string {
  const minVersion = MINIMUM_BROWSER_VERSIONS[browserInfo.name as keyof BrowserRequirements];
  
  if (!minVersion) {
    return 'Your browser is not supported. Please use Chrome, Firefox, Safari, or Edge.';
  }
  
  const browserDisplayNames: Record<string, string> = {
    chrome: 'Chrome',
    firefox: 'Firefox',
    safari: 'Safari',
    edge: 'Edge',
    opera: 'Opera',
    iosSafari: 'Safari on iOS',
    androidChrome: 'Chrome on Android'
  };
  
  const displayName = browserDisplayNames[browserInfo.name] || browserInfo.name;
  
  return `${displayName} version ${minVersion} or higher is required. You are using version ${browserInfo.version}. Please update your browser to use audio recording.`;
}

export function getUnsupportedBrowserAlternatives(browserInfo: BrowserInfo): string[] {
  const alternatives: string[] = [];
  
  if (browserInfo.isMobile) {
    if (browserInfo.isIOS) {
      alternatives.push(
        'Use Safari on iOS 14.5 or later for best compatibility',
        'Try recording on a desktop computer for more reliable results',
        'Consider using the Chrome app if Safari is not working'
      );
    } else if (browserInfo.isAndroid) {
      alternatives.push(
        'Use Chrome on Android for best compatibility',
        'Make sure your Chrome app is updated to the latest version',
        'Try Firefox on Android as an alternative',
        'Consider recording on a desktop for higher quality'
      );
    }
  } else {
    alternatives.push(
      'Update to the latest version of Chrome, Firefox, or Edge',
      'Try a different browser if your current one is not working',
      'Check if your browser extensions are blocking microphone access',
      'Ensure you are using HTTPS (secure connection)'
    );
  }
  
  if (!browserInfo.isSupported) {
    alternatives.unshift('Your browser version is outdated. Please update to the latest version.');
  }
  
  return alternatives;
}

export interface PartialSupportWarning {
  type: 'codec' | 'feature' | 'performance';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export function getPartialSupportWarnings(
  browserInfo: BrowserInfo,
  capabilities: RecordingCapabilities
): PartialSupportWarning[] {
  const warnings: PartialSupportWarning[] = [];
  
  // Check for limited codec support
  if (capabilities.supportedCodecs.length === 0) {
    warnings.push({
      type: 'codec',
      message: 'No audio codecs are supported. Recording may not work.',
      severity: 'high'
    });
  } else if (capabilities.supportedCodecs.length < 2) {
    warnings.push({
      type: 'codec',
      message: 'Limited audio codec support. Recording quality may be affected.',
      severity: 'medium'
    });
  }
  
  // Check for mobile limitations
  if (browserInfo.isMobile) {
    if (browserInfo.isIOS) {
      warnings.push({
        type: 'feature',
        message: 'iOS requires user interaction to start recording. Tap the microphone button when ready.',
        severity: 'low'
      });
      
      if (browserInfo.majorVersion < 15) {
        warnings.push({
          type: 'performance',
          message: 'Your iOS version may have recording limitations. Update to iOS 15+ for best results.',
          severity: 'medium'
        });
      }
    }
    
    if (browserInfo.isAndroid && browserInfo.majorVersion < 10) {
      warnings.push({
        type: 'performance',
        message: 'Older Android versions may have audio quality issues. Update your device for better results.',
        severity: 'low'
      });
    }
  }
  
  // Check for specific browser limitations
  if (browserInfo.name === 'firefox' && browserInfo.majorVersion < 50) {
    warnings.push({
      type: 'feature',
      message: 'Your Firefox version has limited MediaRecorder support. Some features may not work.',
      severity: 'medium'
    });
  }
  
  if (browserInfo.name === 'safari' && !browserInfo.isIOS && browserInfo.majorVersion < 15) {
    warnings.push({
      type: 'codec',
      message: 'Safari has limited codec support. Audio quality may vary.',
      severity: 'low'
    });
  }
  
  return warnings;
}