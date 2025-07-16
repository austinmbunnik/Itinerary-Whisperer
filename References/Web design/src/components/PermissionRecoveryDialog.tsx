import React, { useState, useEffect } from 'react';
import { X, RefreshCw, HelpCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { getBrowserPermissionInstructions } from '../utils/microphonePermissionManager';

interface PermissionRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  denialType: 'temporary' | 'permanent' | 'unknown';
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
}

export const PermissionRecoveryDialog: React.FC<PermissionRecoveryDialogProps> = ({
  isOpen,
  onClose,
  onRetry,
  denialType,
  retryCount,
  maxRetries,
  isRetrying
}) => {
  const [showDetailedSteps, setShowDetailedSteps] = useState(false);
  const [browserInstructions, setBrowserInstructions] = useState(getBrowserPermissionInstructions());

  useEffect(() => {
    setBrowserInstructions(getBrowserPermissionInstructions());
  }, []);

  if (!isOpen) return null;

  const canRetry = denialType === 'temporary' && retryCount < maxRetries;
  const isPermanentlyDenied = denialType === 'permanent' || retryCount >= maxRetries;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Microphone Access Required</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Status Message */}
            <div className={`rounded-lg p-4 mb-4 ${
              isPermanentlyDenied 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              <p className="text-sm">
                {isPermanentlyDenied
                  ? 'Microphone access has been denied. You need to manually enable it in your browser settings.'
                  : 'We need access to your microphone to record conversations. Please grant permission when prompted.'}
              </p>
            </div>

            {/* Quick Actions */}
            {canRetry && (
              <div className="mb-6">
                <button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    isRetrying
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Checking permissions...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      <span>Try Again ({retryCount}/{maxRetries})</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Make sure to click "Allow" when your browser asks for permission
                </p>
              </div>
            )}

            {/* Browser-Specific Instructions */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDetailedSteps(!showDetailedSteps)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    How to enable microphone in {browserInstructions.browser}
                  </span>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transform transition-transform ${
                  showDetailedSteps ? 'rotate-90' : ''
                }`} />
              </button>
              
              {showDetailedSteps && (
                <div className="p-4 bg-white">
                  <ol className="space-y-3">
                    {browserInstructions.steps.map((step, index) => (
                      <li key={index} className="flex">
                        <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                  
                  {/* Additional Help */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Still having issues? Make sure:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-gray-500">
                      <li>• You're using HTTPS (secure connection)</li>
                      <li>• No other app is using your microphone</li>
                      <li>• Your microphone is properly connected</li>
                      <li>• Browser permissions aren't blocked by system settings</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Alternative Actions */}
            {isPermanentlyDenied && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  After updating your browser settings:
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Page</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              We only use your microphone during active recording sessions. 
              Your privacy is important to us.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};