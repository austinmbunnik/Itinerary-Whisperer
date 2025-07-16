import { useState } from 'react';
import { Header } from './components/Header';
import { RecordingSection } from './components/RecordingSection';
import { QuestionsSection } from './components/QuestionsSection';
import { TranscriptSection } from './components/TranscriptSection';
import { ErrorNotification, useNotifications } from './components/ErrorNotification';
import { FloatingRecordingStatus } from './components/RecordingStatusIndicator';
import { RecordingState as ChunkedRecordingState } from './utils/chunkedAudioRecorder';
export function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingState, setRecordingState] = useState<ChunkedRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
    chunkCount: 0,
    memoryStatus: null,
    hasWarnings: false
  });
  const { notifications, removeNotification } = useNotifications();
  const toggleRecording = () => {
    if (isRecording) {
      // Simulate ending recording and generating transcript
      setIsRecording(false);
      setRecordingComplete(true);
      // In a real app, this would come from actual transcription
      setTranscript("User 1: I think we should visit Paris first, then head to Rome.\n\nUser 2: That sounds great! How many days should we spend in each city?\n\nUser 1: Maybe 3 days in Paris and 4 in Rome?\n\nUser 2: Perfect. What about accommodations? Should we look for hotels or Airbnbs?\n\nUser 1: Let's do a mix. Hotel in Paris and maybe an Airbnb in Rome for a more local experience.");
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingComplete(false);
      setTranscript('');
    }
  };
  return <div className="min-h-screen bg-cream text-black" style={{
    backgroundImage: "url('https://uploadthingy.s3.us-west-1.amazonaws.com/juBMQMJCbUfpPFeN2BnR3Q/image%281%29.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundColor: '#f5f2eb',
    backgroundBlendMode: 'soft-light'
  }}>
      <div className="bg-cream/80 min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-center mb-8">
              The group call notetaker
              <br />
              that plans trips
              <br />
              <span className="border-b-4 border-black pb-1">for you.</span>
            </h1>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xl mb-2">
                Generate <strong>instant, bookable</strong> trips,{' '}
                <strong>tailored</strong> to your group.
              </p>
              <p className="text-xl">
                Just gather your friends, hit record, and start chatting.
              </p>
            </div>
            <div className="mt-16">
              <RecordingSection 
                isRecording={isRecording} 
                toggleRecording={toggleRecording}
                onRecordingStateChange={setRecordingState}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-8 mt-16 bg-white/80 p-8 rounded-lg backdrop-blur-sm">
              <QuestionsSection />
              {recordingComplete && <TranscriptSection transcript={transcript} />}
            </div>
          </div>
        </main>
        <ErrorNotification 
          notifications={notifications} 
          onClose={removeNotification} 
        />
        <FloatingRecordingStatus recordingState={recordingState} />
      </div>
    </div>;
}