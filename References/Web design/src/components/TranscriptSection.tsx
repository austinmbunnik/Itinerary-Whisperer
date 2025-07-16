import { FileTextIcon, DownloadIcon } from 'lucide-react';
interface TranscriptSectionProps {
  transcript: string;
}
export const TranscriptSection = ({
  transcript
}: TranscriptSectionProps) => {
  return <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileTextIcon className="h-6 w-6 text-black mr-2" />
          <h2 className="text-2xl font-semibold">Transcript</h2>
        </div>
        <button className="flex items-center bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md text-sm">
          <DownloadIcon className="h-4 w-4 mr-1" />
          Export
        </button>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-80 overflow-y-auto whitespace-pre-line">
        {transcript}
      </div>
      <div className="mt-4">
        <button className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md w-full transition-colors">
          Generate Itinerary
        </button>
      </div>
    </div>;
};