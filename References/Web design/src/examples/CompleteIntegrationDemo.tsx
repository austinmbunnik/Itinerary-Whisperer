import { useState, useEffect } from 'react';
import { IntegratedApp } from '../components/IntegratedApp';
import { Settings, Play, Pause, RotateCcw, Info } from 'lucide-react';
import { appConfig, validateConfig, shouldUseMockServices } from '../config/appConfig';

/**
 * Complete Integration Demo showing the full workflow:
 * Recording -> Transcription -> Travel Analysis -> Upload -> Itinerary Creation
 */
export const CompleteIntegrationDemo = () => {
  const [showConfig, setShowConfig] = useState(false);
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  const [demoMode, setDemoMode] = useState<'live' | 'mock'>('mock');

  useEffect(() => {
    const errors = validateConfig();
    setConfigErrors(errors);
  }, []);

  const toggleDemoMode = () => {
    setDemoMode(prev => prev === 'live' ? 'mock' : 'live');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Controls Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">
                Complete Integration Demo ✈️
              </h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Mode:</span>
                <button
                  onClick={toggleDemoMode}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    demoMode === 'live' 
                      ? 'bg-green-100 text-green-800 border-green-300' 
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}
                >
                  {demoMode === 'live' ? '🔴 Live API' : '🤖 Mock Mode'}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {configErrors.length > 0 && (
                <div className="flex items-center text-amber-600">
                  <Info className="h-4 w-4 mr-1" />
                  <span className="text-sm">{configErrors.length} config issues</span>
                </div>
              )}
              
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Settings className="h-4 w-4 mr-1" />
                Config
              </button>
            </div>
          </div>
          
          {/* Configuration Panel */}
          {showConfig && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-3">Configuration Status</h3>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">API Endpoints</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Base URL:</span>
                      <code className="text-xs bg-gray-200 px-1 rounded">{appConfig.api.baseUrl}</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Transcription:</span>
                      <code className="text-xs bg-gray-200 px-1 rounded">
                        {appConfig.transcription.provider}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-transcribe:</span>
                      <span className={appConfig.transcription.autoTranscribe ? 'text-green-600' : 'text-red-600'}>
                        {appConfig.transcription.autoTranscribe ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Upload Settings</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Max Size:</span>
                      <span className="text-xs">{Math.round(appConfig.upload.maxFileSize / 1024 / 1024)}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chunk Size:</span>
                      <span className="text-xs">{Math.round(appConfig.upload.chunkSize / 1024 / 1024)}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chunking:</span>
                      <span className={appConfig.upload.enableChunking ? 'text-green-600' : 'text-red-600'}>
                        {appConfig.upload.enableChunking ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Features</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Travel Analysis:</span>
                      <span className={appConfig.features.travelAnalysis ? 'text-green-600' : 'text-red-600'}>
                        {appConfig.features.travelAnalysis ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Recovery:</span>
                      <span className={appConfig.features.errorRecovery ? 'text-green-600' : 'text-red-600'}>
                        {appConfig.features.errorRecovery ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mock Services:</span>
                      <span className={shouldUseMockServices() ? 'text-blue-600' : 'text-gray-600'}>
                        {shouldUseMockServices() ? '🤖' : '🔴'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {configErrors.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                  <h4 className="font-medium text-amber-800 mb-2">Configuration Issues:</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {configErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workflow Guide */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <span className="text-blue-800">Record conversation</span>
            </div>
            <div className="text-blue-400">→</div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <span className="text-blue-800">Auto-transcribe</span>
            </div>
            <div className="text-blue-400">→</div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <span className="text-blue-800">Analyze travel plans</span>
            </div>
            <div className="text-blue-400">→</div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <span className="text-blue-800">Create itinerary</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Application */}
      <IntegratedApp />

      {/* Developer Notes */}
      <div className="bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Integration Features Demonstrated</h3>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-3 text-gray-800">Recording → Transcription Flow</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Automatic transcription after recording completion</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Real-time progress tracking with travel-themed messages</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Intelligent travel context analysis from transcript</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Error recovery with user-friendly retry options</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-gray-800">Transcript → Upload Flow</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Travel-themed "Create our itinerary" button appears</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Engaging upload experience with progress animations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Rotating fun messages during upload process</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Comprehensive error handling with recovery guidance</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🔧 Backend Integration Requirements</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Transcription API:</strong> POST to /api/transcribe with audio file, returns transcript and metadata</div>
                <div><strong>Upload API:</strong> POST to /api/upload with audio + transcript, returns itinerary creation status</div>
                <div><strong>Chunked Upload:</strong> Support for /api/upload/chunk and /api/upload/finalize endpoints</div>
                <div><strong>Error Handling:</strong> Proper HTTP status codes and detailed error messages</div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">✨ User Experience Highlights</h4>
              <div className="text-sm text-green-800 space-y-1">
                <div><strong>Seamless Flow:</strong> Each step automatically triggers the next with clear visual feedback</div>
                <div><strong>Travel Context:</strong> Smart analysis of conversation to extract destinations, dates, and activities</div>
                <div><strong>Engaging UI:</strong> Travel-themed messaging and animations make the process exciting</div>
                <div><strong>Error Recovery:</strong> Every failure mode has clear, actionable recovery options</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteIntegrationDemo;