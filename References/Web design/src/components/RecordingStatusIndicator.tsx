import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  HardDrive, 
  AlertTriangle,
  TrendingUp,
  Database
} from 'lucide-react';
import { RecordingState } from '../utils/chunkedAudioRecorder';
import { MemoryManager } from '../utils/memoryManager';

interface RecordingStatusIndicatorProps {
  recordingState: RecordingState;
  compact?: boolean;
}

export const RecordingStatusIndicator: React.FC<RecordingStatusIndicatorProps> = ({
  recordingState,
  compact = false
}) => {
  const [memoryStatus, setMemoryStatus] = useState(recordingState.memoryStatus);
  const memoryManager = MemoryManager.getInstance();

  useEffect(() => {
    if (recordingState.isRecording && !recordingState.memoryStatus) {
      // Update memory status periodically
      const updateMemoryStatus = async () => {
        const status = await memoryManager.getMemoryStatus();
        setMemoryStatus(status);
      };

      updateMemoryStatus();
      const interval = setInterval(updateMemoryStatus, 5000);
      
      return () => clearInterval(interval);
    } else {
      setMemoryStatus(recordingState.memoryStatus);
    }
  }, [recordingState, memoryManager]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMemoryStatusColor = () => {
    if (!memoryStatus) return 'text-gray-600';
    if (memoryStatus.isCritical) return 'text-red-600';
    if (memoryStatus.isLow) return 'text-amber-600';
    return 'text-green-600';
  };

  const getMemoryStatusBg = () => {
    if (!memoryStatus) return 'bg-gray-50';
    if (memoryStatus.isCritical) return 'bg-red-50';
    if (memoryStatus.isLow) return 'bg-amber-50';
    return 'bg-green-50';
  };

  if (!recordingState.isRecording && compact) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-1.5">
          <div className="relative">
            <Activity className="h-4 w-4 text-red-500" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {formatDuration(recordingState.duration)}
          </span>
        </div>
        
        {recordingState.hasWarnings && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        
        <div className={`flex items-center space-x-1 ${getMemoryStatusColor()}`}>
          <HardDrive className="h-4 w-4" />
          <span className="text-xs">
            {memoryStatus ? `${Math.round(memoryStatus.percentage * 100)}%` : '...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 p-4 space-y-3">
      {/* Recording Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Activity className={`h-5 w-5 ${recordingState.isPaused ? 'text-amber-500' : 'text-red-500'}`} />
            {!recordingState.isPaused && (
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="font-medium text-gray-900">
            {recordingState.isPaused ? 'Recording Paused' : 'Recording Active'}
          </span>
        </div>
        <span className="text-lg font-mono font-medium text-gray-700">
          {formatDuration(recordingState.duration)}
        </span>
      </div>

      {/* Memory Status */}
      {memoryStatus && (
        <div className={`rounded-lg p-3 ${getMemoryStatusBg()}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className={`h-4 w-4 ${getMemoryStatusColor()}`} />
              <span className="text-sm font-medium text-gray-700">Memory Usage</span>
            </div>
            <span className={`text-sm font-medium ${getMemoryStatusColor()}`}>
              {Math.round(memoryStatus.percentage * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                memoryStatus.isCritical ? 'bg-red-500' :
                memoryStatus.isLow ? 'bg-amber-500' :
                'bg-green-500'
              }`}
              style={{ width: `${memoryStatus.percentage * 100}%` }}
            />
          </div>
          {memoryStatus.isLow && (
            <p className="text-xs mt-1 text-amber-700">
              Memory usage is high. Recording quality may be reduced.
            </p>
          )}
        </div>
      )}

      {/* Recording Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <Database className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Size</p>
            <p className="text-sm font-medium text-gray-900">{formatSize(recordingState.size)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Chunks</p>
            <p className="text-sm font-medium text-gray-900">{recordingState.chunkCount}</p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {recordingState.hasWarnings && (
        <div className="flex items-start space-x-2 p-2 bg-amber-50 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-amber-800">
              {recordingState.duration > 30 * 60 * 1000 
                ? 'Long recording detected. Consider stopping to save memory.'
                : memoryStatus?.isLow 
                  ? 'Memory usage is high. Recording may stop automatically.'
                  : 'Recording approaching limits.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Floating status widget for minimal UI interference
export const FloatingRecordingStatus: React.FC<{ recordingState: RecordingState }> = ({ 
  recordingState 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!recordingState.isRecording) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {isExpanded ? (
        <div className="animate-fade-in">
          <RecordingStatusIndicator recordingState={recordingState} />
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Minimize</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="animate-fade-in"
        >
          <RecordingStatusIndicator recordingState={recordingState} compact />
        </button>
      )}
    </div>
  );
};