import { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

interface LessonReleaseTimerProps {
  releaseDate: Date;
  lessonTitle: string;
}

export function LessonReleaseTimer({ releaseDate, lessonTitle }: LessonReleaseTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [isReleased, setIsReleased] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const releaseTime = new Date(releaseDate).getTime();
      const difference = releaseTime - now;

      if (difference <= 0) {
        setIsReleased(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [releaseDate]);

  if (isReleased) {
    return (
      <div className="aspect-video bg-black relative flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <p className="text-white text-xl mb-2">Aula Liberada!</p>
          <p className="text-gray-400">Recarregue a página para assistir</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black relative flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="mb-6"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mb-4 mx-auto">
            <Timer className="h-12 w-12 text-white" />
          </div>
        </motion.div>

        <h3 className="text-white text-2xl font-bold mb-2">{lessonTitle}</h3>
        <p className="text-gray-400 mb-6">Esta aula será liberada em:</p>

        <div className="grid grid-cols-4 gap-4 mb-6 max-w-md mx-auto">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-white">{timeLeft.days}</div>
            <div className="text-sm text-gray-400">Dias</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-white">{timeLeft.hours.toString().padStart(2, '0')}</div>
            <div className="text-sm text-gray-400">Horas</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-white">{timeLeft.minutes.toString().padStart(2, '0')}</div>
            <div className="text-sm text-gray-400">Min</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-white animate-pulse">{timeLeft.seconds.toString().padStart(2, '0')}</div>
            <div className="text-sm text-gray-400">Seg</div>
          </div>
        </div>

        <div className="text-gray-500 text-sm">
          <Clock className="inline h-4 w-4 mr-1" />
          Liberação: {new Date(releaseDate).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}