
import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  minutes: number;
  title?: string;
  backgroundColor?: string;
  textColor?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  minutes,
  title = "Oferta por tempo limitado",
  backgroundColor = '#ef4444',
  textColor = 'white'
}) => {
  const [timeLeft, setTimeLeft] = useState({
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const endTime = new Date(Date.now() + minutes * 60 * 1000);
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance > 0) {
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ minutes: mins, seconds: secs });
      } else {
        setTimeLeft({ minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [minutes]);

  return (
    <div 
      className="w-full py-4 px-6 text-center relative"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Timer className="w-4 h-4" />
          <span>{title}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="bg-white text-black rounded px-3 py-1 font-bold text-lg min-w-[50px]">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </div>
          <span className="text-lg font-bold mx-1">:</span>
          <div className="bg-white text-black rounded px-3 py-1 font-bold text-lg min-w-[50px]">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
