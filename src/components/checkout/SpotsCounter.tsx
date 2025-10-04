import React, { useState, useEffect } from 'react';

interface SpotsCounterProps {
  count: number;
  title: string;
  backgroundColor: string;
  textColor: string;
  mode?: 'automatic' | 'manual' | 'time-based';
  decrementInterval?: number;
}

export default function SpotsCounter({ 
  count, 
  title, 
  backgroundColor, 
  textColor,
  mode = 'manual',
  decrementInterval = 60
}: SpotsCounterProps) {
  const [currentCount, setCurrentCount] = useState(count);

  useEffect(() => {
    setCurrentCount(count);
  }, [count]);

  useEffect(() => {
    // Se o modo for time-based, decrementar automaticamente
    if (mode === 'time-based' && currentCount > 0) {
      const timer = setInterval(() => {
        setCurrentCount(prev => Math.max(0, prev - 1));
      }, decrementInterval * 1000);

      return () => clearInterval(timer);
    }
  }, [mode, decrementInterval, currentCount]);

  return (
    <div 
      className="py-3 px-4 text-center"
      style={{ backgroundColor }}
    >
      <div 
        className="text-3xl font-bold mb-1"
        style={{ color: textColor }}
      >
        {currentCount}
      </div>
      <div 
        className="text-sm font-semibold tracking-wider"
        style={{ color: textColor }}
      >
        {title}
      </div>
    </div>
  );
}
