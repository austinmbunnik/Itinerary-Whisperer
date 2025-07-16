import { useState, useEffect } from 'react';
import { Plane, MapPin, Camera, Sparkles, Settings } from 'lucide-react';
import { EnhancedItineraryButton, ProgressDetails, ButtonState } from '../components/EnhancedItineraryButton';
import { TravelThemedTranscriptSection } from '../components/TravelThemedTranscriptSection';
import { EnhancedNotificationProvider } from '../components/EnhancedErrorNotification';

/**
 * Demo component showcasing the travel-themed upload experience
 * with engaging animations, fun loading messages, and smooth state transitions
 */
export const TravelThemedUploadDemo = () => {
  const [demoState, setDemoState] = useState<ButtonState>('idle');
  const [demoProgress, setDemoProgress] = useState(0);
  const [isAutoDemo, setIsAutoDemo] = useState(false);
  const [mockTranscript, setMockTranscript] = useState('');

  // Mock transcript for demo
  const fullMockTranscript = `Let's plan our amazing trip to Japan! 

We should definitely visit Tokyo first - I want to see the Shibuya crossing and visit that famous fish market. Oh, and we need to try authentic ramen!

Then we could take the bullet train to Kyoto. I've heard the temples there are incredible, especially during cherry blossom season. We should book a traditional ryokan for the full experience.

For our last stop, what about Osaka? The food scene there is supposed to be amazing. We could spend a whole day just eating our way through Dotonbori!

We'll need to book flights for next month and figure out the JR Pass situation. Should we get pocket WiFi or international data plans?

Don't forget to pack comfortable walking shoes - I heard we'll be doing a lot of walking. And we should download some translation apps just in case.

This is going to be the trip of a lifetime! ✈️🗾`;

  // Auto demo sequence
  useEffect(() => {
    if (!isAutoDemo) return;

    const runAutoDemo = async () => {
      // Start with processing
      setDemoState('processing');
      await delay(2000);
      
      // Move to uploading
      setDemoState('uploading');
      setDemoProgress(0);
      
      // Simulate progress
      for (let i = 0; i <= 100; i += 5) {
        setDemoProgress(i);
        await delay(150);
      }
      
      // Success state
      setDemoState('success');
      await delay(3000);
      
      // Back to idle
      setDemoState('idle');
      setDemoProgress(0);
      setIsAutoDemo(false);
    };

    runAutoDemo();
  }, [isAutoDemo]);

  // Simulate typing transcript
  useEffect(() => {
    if (mockTranscript.length < fullMockTranscript.length) {
      const timer = setTimeout(() => {
        setMockTranscript(fullMockTranscript.slice(0, mockTranscript.length + 1));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [mockTranscript, fullMockTranscript]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDemoClick = () => {
    if (demoState === 'idle') {
      setIsAutoDemo(true);
    }
  };

  const handleStateChange = (state: ButtonState) => {
    setDemoState(state);
    setDemoProgress(0);
  };

  const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });

  return (
    <EnhancedNotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Plane className="h-8 w-8 text-blue-600" />
                  <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Travel-Themed Upload Demo
                </h1>
              </div>
              <div className="text-sm text-gray-600">
                Experience engaging upload states ✨
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center py-8">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Transform Upload Anxiety into Travel Excitement! ✈️
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                See how travel-themed messaging, smooth animations, and engaging visual feedback 
                turn a mundane upload process into an exciting journey preview.
              </p>
            </section>

            {/* Demo Controls */}
            <section className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-gray-600" />
                  Interactive Demo Controls
                </h3>
                <div className="text-sm text-gray-500">
                  Current State: <span className="font-medium capitalize">{demoState}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* State Controls */}
                <div>
                  <h4 className="font-medium mb-3 text-gray-700">Manual State Testing</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['idle', 'processing', 'uploading', 'success', 'error'] as ButtonState[]).map((state) => (
                      <button
                        key={state}
                        onClick={() => handleStateChange(state)}
                        className={`px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                          demoState === state
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {state.charAt(0).toUpperCase() + state.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Demo */}
                <div>
                  <h4 className="font-medium mb-3 text-gray-700">Automated Demo</h4>
                  <button
                    onClick={() => setIsAutoDemo(true)}
                    disabled={isAutoDemo}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isAutoDemo ? 'Demo Running...' : 'Run Full Demo Sequence'}</span>
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    Watch all states transition automatically with realistic timing
                  </p>
                </div>
              </div>

              {/* Progress Slider for Upload State */}
              {demoState === 'uploading' && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Progress: {demoProgress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={demoProgress}
                    onChange={(e) => setDemoProgress(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </section>

            {/* Button Demo Section */}
            <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <Camera className="h-6 w-6 mr-2 text-purple-600" />
                Enhanced Itinerary Button Showcase
              </h3>
              
              <div className="space-y-6">
                <div className="text-center">
                  <EnhancedItineraryButton
                    state={demoState}
                    progress={demoProgress}
                    onClick={handleDemoClick}
                    onRetry={() => handleStateChange('idle')}
                    size="large"
                    className="mx-auto"
                  />
                </div>

                <ProgressDetails
                  state={demoState}
                  progress={demoProgress}
                  speed={1024 * 512} // 512 KB/s
                  remainingTime={((100 - demoProgress) / 100) * 60000} // Remaining time simulation
                />

                {/* Feature Highlights */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">🎨 Visual Progress</h4>
                    <p className="text-sm text-blue-800">
                      Color-fill progress indication with smooth animations and travel-themed gradients
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">💬 Fun Messages</h4>
                    <p className="text-sm text-purple-800">
                      Rotating travel-themed loading messages that build excitement for the journey
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">✨ State Transitions</h4>
                    <p className="text-sm text-green-800">
                      Smooth animations and state management prevent user confusion and double-clicks
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Full Integration Demo */}
            <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <MapPin className="h-6 w-6 mr-2 text-green-600" />
                Complete Travel Experience
              </h3>
              
              <TravelThemedTranscriptSection
                transcript={mockTranscript}
                audioBlob={mockAudioBlob}
                audioMetadata={{
                  duration: 120000,
                  recordedAt: new Date().toISOString(),
                  quality: 'high'
                }}
                onUploadSuccess={(response) => {
                  console.log('Demo upload success:', response);
                }}
                onUploadError={(error) => {
                  console.log('Demo upload error:', error);
                }}
              />
            </section>

            {/* Feature Summary */}
            <section className="bg-gradient-to-r from-gray-900 to-black text-white rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">
                Why This Upload Experience Works ✨
              </h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="font-semibold mb-2">Reduces Anxiety</h4>
                  <p className="text-sm text-gray-300">
                    Fun messages and clear progress eliminate the stress of waiting
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-3">🚀</div>
                  <h4 className="font-semibold mb-2">Builds Excitement</h4>
                  <p className="text-sm text-gray-300">
                    Travel-themed language creates anticipation for the final result
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-3">💎</div>
                  <h4 className="font-semibent mb-2">Premium Feel</h4>
                  <p className="text-sm text-gray-300">
                    Smooth animations and attention to detail convey quality
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-3">🎨</div>
                  <h4 className="font-semibold mb-2">Brand Consistency</h4>
                  <p className="text-sm text-gray-300">
                    Every interaction reinforces the travel planning theme
                  </p>
                </div>
              </div>
            </section>

            {/* Technical Implementation Notes */}
            <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-yellow-800">
                🛠️ Implementation Highlights
              </h3>
              <div className="space-y-3 text-sm text-yellow-800">
                <div><strong>Rotating Messages:</strong> 10 unique travel-themed messages that rotate every 3.5 seconds during upload</div>
                <div><strong>Visual Feedback:</strong> Progress fill with shimmer effects, floating travel icons, and color-coded states</div>
                <div><strong>State Management:</strong> Prevents double-clicks and handles all edge cases gracefully</div>
                <div><strong>Accessibility:</strong> Clear status updates, keyboard navigation, and screen reader support</div>
                <div><strong>Performance:</strong> Optimized animations using CSS transforms and hardware acceleration</div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>&copy; 2024 Travel-Themed Upload Demo - Making uploads engaging, one journey at a time! ✈️</p>
          </div>
        </footer>
      </div>
    </EnhancedNotificationProvider>
  );
};

export default TravelThemedUploadDemo;