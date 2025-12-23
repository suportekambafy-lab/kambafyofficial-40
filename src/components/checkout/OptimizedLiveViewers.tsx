import { memo, useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface OptimizedLiveViewersProps {
  initialCount?: number;
  minViewers?: number;
  maxViewers?: number;
  tc?: (key: string) => string;
}

export const OptimizedLiveViewers = memo(({ 
  initialCount = 47,
  minViewers = 32,
  maxViewers = 89,
  tc 
}: OptimizedLiveViewersProps) => {
  const [viewers, setViewers] = useState(initialCount);
  const [isVisible, setIsVisible] = useState(false);

  // Default translations
  const getText = () => {
    if (tc) {
      const result = tc('checkout.liveViewers');
      if (result !== 'checkout.liveViewers') {
        return result;
      }
    }
    return 'pessoas estão vendo este produto agora';
  };

  useEffect(() => {
    // Show notification after brief delay
    const showTimer = setTimeout(() => setIsVisible(true), 800);

    // Update viewer count periodically
    const updateInterval = setInterval(() => {
      const variation = Math.floor(Math.random() * 5) - 2;
      setViewers(prev => {
        const newCount = prev + variation;
        return Math.max(minViewers, Math.min(maxViewers, newCount));
      });
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(updateInterval);
    };
  }, [minViewers, maxViewers]);

  return (
    <div 
      className={`live-viewers-notification ${isVisible ? 'visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-primary pulse-dot" />
        <span className="text-sm font-medium">
          <span className="viewers-count">{viewers}</span> {getText()}
        </span>
      </div>
    </div>
  );
});

OptimizedLiveViewers.displayName = 'OptimizedLiveViewers';
