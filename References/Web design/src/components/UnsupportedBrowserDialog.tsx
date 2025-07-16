import React from 'react';
import { AlertTriangle, Download, Smartphone, Monitor, Chrome, CheckCircle, XCircle } from 'lucide-react';
import { 
  BrowserInfo, 
  RecordingCapabilities,
  getBrowserUpgradeMessage,
  getUnsupportedBrowserAlternatives,
  getPartialSupportWarnings,
  PartialSupportWarning
} from '../utils/browserCompatibility';
import { AudioRecordingManager } from '../utils/audioRecordingManager';

interface UnsupportedBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  browserInfo: BrowserInfo;
  capabilities: RecordingCapabilities;
  onTryAnyway?: () => void;
}

export const UnsupportedBrowserDialog: React.FC<UnsupportedBrowserDialogProps> = ({
  isOpen,
  onClose,
  browserInfo,
  capabilities,
  onTryAnyway
}) => {
  if (!isOpen) return null;

  const upgradeMessage = getBrowserUpgradeMessage(browserInfo);
  const alternatives = getUnsupportedBrowserAlternatives(browserInfo);
  const warnings = getPartialSupportWarnings(browserInfo, capabilities);
  const featureSupport = AudioRecordingManager.checkFeatureSupport();
  
  const hasPartialSupport = capabilities.hasMediaRecorder && capabilities.hasGetUserMedia && capabilities.supportedCodecs.length > 0;

  const getSeverityColor = (severity: PartialSupportWarning['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: PartialSupportWarning['severity']) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {hasPartialSupport ? 'Limited Browser Support' : 'Browser Not Supported'}
                </h2>
                <p className="text-sm text-gray-600">
                  {browserInfo.name.charAt(0).toUpperCase() + browserInfo.name.slice(1)} {browserInfo.version} 
                  {browserInfo.isMobile ? ` on ${browserInfo.isIOS ? 'iOS' : 'Android'}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Main Message */}
            <div className="mb-6">
              <p className="text-gray-700 mb-2">{upgradeMessage}</p>
            </div>

            {/* Feature Support Table */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Monitor className="h-5 w-5 mr-2" />
                Feature Support Status
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <FeatureRow 
                  label="Basic Recording" 
                  supported={featureSupport.basicRecording} 
                  critical
                />
                <FeatureRow 
                  label="Microphone Access" 
                  supported={capabilities.hasGetUserMedia} 
                  critical
                />
                <FeatureRow 
                  label="Audio Codecs" 
                  supported={capabilities.supportedCodecs.length > 0}
                  detail={capabilities.supportedCodecs.length > 0 
                    ? `${capabilities.supportedCodecs.length} codec${capabilities.supportedCodecs.length > 1 ? 's' : ''} supported`
                    : 'No codecs supported'
                  }
                />
                <FeatureRow 
                  label="Pause/Resume" 
                  supported={featureSupport.pause && featureSupport.resume} 
                />
                <FeatureRow 
                  label={browserInfo.isMobile ? 'Mobile Optimized' : 'Desktop Features'} 
                  supported={browserInfo.isSupported} 
                />
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Known Limitations</h3>
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div 
                      key={index} 
                      className={`flex items-start space-x-2 p-3 rounded-lg bg-gray-50 ${getSeverityColor(warning.severity)}`}
                    >
                      <span className="mt-0.5">{getSeverityIcon(warning.severity)}</span>
                      <span className="text-sm">{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supported Codecs */}
            {capabilities.supportedCodecs.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Supported Audio Formats</h3>
                <div className="grid grid-cols-2 gap-2">
                  {capabilities.supportedCodecs.map((codec, index) => (
                    <div 
                      key={index}
                      className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">
                        {codec.format.toUpperCase()}/{codec.codec.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Recommended Alternatives
              </h3>
              <ul className="space-y-2">
                {alternatives.map((alternative, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span className="text-sm text-gray-700">{alternative}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Browser Download Links */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Download a Supported Browser</h4>
              <div className="grid grid-cols-2 gap-2">
                <BrowserLink 
                  name="Chrome" 
                  url="https://www.google.com/chrome/"
                  icon={<Chrome className="h-5 w-5" />}
                />
                <BrowserLink 
                  name="Firefox" 
                  url="https://www.mozilla.org/firefox/"
                  icon={<div className="h-5 w-5 text-orange-600">🦊</div>}
                />
                <BrowserLink 
                  name="Edge" 
                  url="https://www.microsoft.com/edge"
                  icon={<div className="h-5 w-5 text-blue-600">E</div>}
                />
                <BrowserLink 
                  name="Safari" 
                  url="https://support.apple.com/downloads/safari"
                  icon={<div className="h-5 w-5 text-blue-500">S</div>}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center text-xs text-gray-500">
              {browserInfo.isMobile && <Smartphone className="h-4 w-4 mr-1" />}
              {!browserInfo.isMobile && <Monitor className="h-4 w-4 mr-1" />}
              <span>Detected: {navigator.userAgent.substring(0, 50)}...</span>
            </div>
            <div className="flex space-x-3">
              {hasPartialSupport && onTryAnyway && (
                <button
                  onClick={onTryAnyway}
                  className="px-4 py-2 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium transition-colors"
                >
                  Try Anyway
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper Components
const FeatureRow: React.FC<{
  label: string;
  supported: boolean;
  critical?: boolean;
  detail?: string;
}> = ({ label, supported, critical, detail }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${critical ? 'font-medium' : ''}`}>{label}</span>
    <div className="flex items-center space-x-2">
      {detail && <span className="text-xs text-gray-500">{detail}</span>}
      {supported ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-red-600" />
      )}
    </div>
  </div>
);

const BrowserLink: React.FC<{
  name: string;
  url: string;
  icon: React.ReactNode;
}> = ({ name, url, icon }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center space-x-2 p-2 bg-white hover:bg-gray-50 rounded-lg transition-colors"
  >
    {icon}
    <span className="text-sm font-medium">{name}</span>
  </a>
);