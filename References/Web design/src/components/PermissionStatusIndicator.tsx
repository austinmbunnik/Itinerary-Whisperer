import React from 'react';
import { Shield, ShieldOff, ShieldCheck, Loader } from 'lucide-react';
import type { PermissionState } from '../utils/microphonePermissionManager';

interface PermissionStatusIndicatorProps {
  permissionState: PermissionState;
  isRetrying: boolean;
  compact?: boolean;
}

export const PermissionStatusIndicator: React.FC<PermissionStatusIndicatorProps> = ({
  permissionState,
  isRetrying,
  compact = false
}) => {
  if (permissionState === 'granted' && !compact) {
    return null; // Don't show indicator when permission is granted (unless compact mode)
  }

  const getStatusConfig = () => {
    if (isRetrying) {
      return {
        icon: <Loader className="h-4 w-4 animate-spin" />,
        text: 'Checking permission...',
        className: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    }

    switch (permissionState) {
      case 'granted':
        return {
          icon: <ShieldCheck className="h-4 w-4" />,
          text: 'Microphone access granted',
          className: 'bg-green-50 text-green-700 border-green-200'
        };
      case 'denied':
        return {
          icon: <ShieldOff className="h-4 w-4" />,
          text: 'Microphone access denied',
          className: 'bg-red-50 text-red-700 border-red-200'
        };
      case 'prompt':
        return {
          icon: <Shield className="h-4 w-4" />,
          text: 'Microphone permission required',
          className: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'checking':
        return {
          icon: <Loader className="h-4 w-4 animate-spin" />,
          text: 'Checking permissions...',
          className: 'bg-gray-50 text-gray-700 border-gray-200'
        };
      default:
        return {
          icon: <Shield className="h-4 w-4" />,
          text: 'Unknown permission state',
          className: 'bg-gray-50 text-gray-700 border-gray-200'
        };
    }
  };

  const { icon, text, className } = getStatusConfig();

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-full border ${className}`}>
        {icon}
        <span className="text-xs font-medium">{text}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${className} backdrop-blur-sm`}>
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  );
};