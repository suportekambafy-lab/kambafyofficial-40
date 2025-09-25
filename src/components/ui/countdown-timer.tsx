import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  onComplete?: () => void;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate, onComplete, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        setTimeLeft({ days, hours, minutes, seconds });
        setIsComplete(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!isComplete) {
          setIsComplete(true);
          onComplete?.();
        }
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete, isComplete]);

  if (isComplete) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Clock className="h-4 w-4" />
        <span>Disponível agora!</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4 text-primary" />
      <div className="flex gap-2 text-sm font-mono">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-primary">{timeLeft.days}</span>
            <span className="text-xs text-muted-foreground">dias</span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-xs text-muted-foreground">horas</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-xs text-muted-foreground">min</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-xs text-muted-foreground">seg</span>
        </div>
      </div>
    </div>
  );
}