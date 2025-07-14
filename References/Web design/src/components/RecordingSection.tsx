import React from 'react';
import { MicIcon, StopCircleIcon } from 'lucide-react';
interface RecordingSectionProps {
  isRecording: boolean;
  toggleRecording: () => void;
}
export const RecordingSection = ({
  isRecording,
  toggleRecording
}: RecordingSectionProps) => {
  return <div className="flex flex-col items-center bg-white/80 p-8 rounded-lg backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-6">Try it out</h2>
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-black hover:bg-gray-800'} cursor-pointer transition-colors`} onClick={toggleRecording}>
        {isRecording ? <StopCircleIcon className="h-12 w-12 text-white" /> : <MicIcon className="h-12 w-12 text-white" />}
      </div>
      <p className="text-lg">
        {isRecording ? <span className="text-red-600 font-medium">
            Recording... Click to stop
          </span> : 'Click to start recording your conversation'}
      </p>
    </div>;
};