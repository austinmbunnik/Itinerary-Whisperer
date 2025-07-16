import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Plane, 
  Camera, 
  Compass, 
  Mountain, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Sparkles,
  Globe,
  Backpack,
  Route
} from 'lucide-react';

export type ButtonState = 'idle' | 'processing' | 'uploading' | 'success' | 'error';

interface EnhancedItineraryButtonProps {
  state: ButtonState;
  progress?: number; // 0-100
  onClick: () => void;
  onRetry?: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

interface TravelMessage {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  duration?: number;
}

const TRAVEL_MESSAGES: TravelMessage[] = [
  { text: "Packing your memories...", icon: Backpack, duration: 3000 },
  { text: "Consulting travel experts...", icon: Compass, duration: 3000 },
  { text: "Finding hidden gems...", icon: Sparkles, duration: 3000 },
  { text: "Plotting scenic routes...", icon: Route, duration: 3000 },
  { text: "Discovering local flavors...", icon: MapPin, duration: 3000 },
  { text: "Booking magical moments...", icon: Camera, duration: 3000 },
  { text: "Exploring new horizons...", icon: Mountain, duration: 3000 },
  { text: "Connecting with wanderlust...", icon: Globe, duration: 3000 },
  { text: "Crafting perfect adventures...", icon: Plane, duration: 3000 },
  { text: "Weaving travel stories...", icon: Sparkles, duration: 3000 }
];

export const EnhancedItineraryButton = ({
  state,
  progress = 0,
  onClick,
  onRetry,
  disabled = false,
  className = '',
  size = 'large'
}: EnhancedItineraryButtonProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const messageIntervalRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  // Rotate travel messages during upload
  useEffect(() => {
    if (state === 'uploading') {
      const rotateMessage = () => {
        setIsAnimating(true);
        
        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % TRAVEL_MESSAGES.length);
          setIsAnimating(false);
        }, 300); // Animation transition time
      };

      // Initial rotation after a delay
      const initialDelay = setTimeout(rotateMessage, 2000);
      
      // Set up interval for subsequent rotations
      messageIntervalRef.current = window.setInterval(rotateMessage, 3500);

      return () => {
        clearTimeout(initialDelay);
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current);
        }
      };
    } else {
      // Clear interval when not uploading
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      setCurrentMessageIndex(0);
      setIsAnimating(false);
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-4 py-2 text-sm';
      case 'medium':
        return 'px-6 py-3 text-base';
      case 'large':
        return 'px-8 py-4 text-lg';
      default:
        return 'px-8 py-4 text-lg';
    }
  };

  const getButtonContent = () => {
    const currentMessage = TRAVEL_MESSAGES[currentMessageIndex];
    const IconComponent = currentMessage.icon;

    switch (state) {
      case 'processing':
        return (
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing your journey...</span>
          </div>
        );

      case 'uploading':
        return (
          <div className="flex items-center justify-center space-x-3">
            <div className={`transition-all duration-300 ${isAnimating ? 'scale-75 opacity-50' : 'scale-100 opacity-100'}`}>
              <IconComponent className="h-5 w-5 animate-pulse" />
            </div>
            <span className={`transition-all duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
              {currentMessage.text}
            </span>
            <span className="text-sm opacity-75">
              {progress}%
            </span>
          </div>
        );

      case 'success':
        return (
          <div className="flex items-center justify-center space-x-3">
            <CheckCircle className="h-5 w-5 animate-bounce" />
            <span>Itinerary created! ✈️</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center justify-center space-x-3">
            <XCircle className="h-5 w-5" />
            <span>Oops! Let's try again</span>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center space-x-3">
            <Plane className="h-5 w-5 transform transition-transform group-hover:translate-x-1" />
            <span>Create our itinerary</span>
          </div>
        );
    }
  };

  const getButtonStyles = () => {
    const baseStyles = `
      relative overflow-hidden font-semibold rounded-xl
      transition-all duration-500 ease-out
      transform hover:scale-[1.02] active:scale-[0.98]
      shadow-lg hover:shadow-xl
      ${getSizeClasses()}
    `;

    switch (state) {
      case 'processing':
        return `${baseStyles} bg-gradient-to-r from-amber-500 to-orange-500 text-white cursor-wait`;
      
      case 'uploading':
        return `${baseStyles} bg-gradient-to-r from-blue-500 to-purple-600 text-white cursor-wait`;
      
      case 'success':
        return `${baseStyles} bg-gradient-to-r from-green-500 to-emerald-600 text-white cursor-default`;
      
      case 'error':
        return `${baseStyles} bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 cursor-pointer`;
      
      default:
        if (disabled) {
          return `${baseStyles} bg-gray-300 text-gray-500 cursor-not-allowed`;
        }
        return `${baseStyles} bg-gradient-to-r from-gray-900 to-black text-white hover:from-black hover:to-gray-800 cursor-pointer group`;
    }
  };

  const handleClick = () => {
    if (disabled || state === 'processing' || state === 'uploading' || state === 'success') {
      return;
    }

    if (state === 'error' && onRetry) {
      onRetry();
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state === 'processing' || state === 'uploading' || state === 'success'}
      className={`${getButtonStyles()} ${className}`}
    >
      {/* Progress Fill Background */}
      {state === 'uploading' && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)'
          }}
        />
      )}

      {/* Animated Background Effects */}
      {state === 'uploading' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
          <div 
            className="absolute top-0 left-0 h-full w-2 bg-white/30 transform -skew-x-12 animate-shimmer"
            style={{
              left: `${progress - 10}%`,
              transition: 'left 0.3s ease-out'
            }}
          />
        </div>
      )}

      {/* Success Celebration Effect */}
      {state === 'success' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/20 via-transparent to-yellow-300/20 animate-pulse" />
        </div>
      )}

      {/* Error Pulse Effect */}
      {state === 'error' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-300/20 via-transparent to-red-300/20 animate-pulse" />
        </div>
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center">
        {getButtonContent()}
      </span>

      {/* Floating Travel Icons for Upload State */}
      {state === 'uploading' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-2 right-4 opacity-20 animate-float-slow">
            <MapPin className="h-3 w-3" />
          </div>
          <div className="absolute bottom-2 left-6 opacity-20 animate-float-slow" style={{ animationDelay: '1s' }}>
            <Camera className="h-3 w-3" />
          </div>
          <div className="absolute top-1/2 right-8 opacity-20 animate-float-slow" style={{ animationDelay: '2s' }}>
            <Compass className="h-2 w-2" />
          </div>
        </div>
      )}
    </button>
  );
};

// Additional component for progress details below the button
interface ProgressDetailsProps {
  state: ButtonState;
  progress: number;
  speed?: number;
  remainingTime?: number;
  className?: string;
}

export const ProgressDetails = ({
  state,
  progress,
  speed = 0,
  remainingTime = 0,
  className = ''
}: ProgressDetailsProps) => {
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  if (state !== 'uploading') return null;

  return (
    <div className={`mt-4 space-y-3 ${className}`}>
      {/* Visual Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="absolute -top-8 right-0 text-sm font-medium text-blue-600">
          {progress}%
        </div>
      </div>

      {/* Upload Statistics */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <Globe className="h-4 w-4 mr-1" />
            {formatSpeed(speed)}
          </span>
          {remainingTime > 0 && (
            <span className="flex items-center">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {formatTime(remainingTime)} remaining
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Uploading your travel plans...
        </div>
      </div>
    </div>
  );
};

// CSS animations (add to your global CSS or include via styled-components)
export const buttonAnimationStyles = `
@keyframes shimmer {
  0% { transform: translateX(-100%) skewX(-12deg); }
  100% { transform: translateX(200%) skewX(-12deg); }
}

@keyframes float-slow {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-float-slow {
  animation: float-slow 3s ease-in-out infinite;
}
`;