import { motion } from 'framer-motion';
import { BookOpen, Clock, Trophy, Flame, CheckCircle2, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface NetflixStatsPanelProps {
  totalLessons: number;
  completedLessons: number;
  totalModules: number;
  completedModules: number;
  totalWatchTime?: number; // in minutes
  currentStreak?: number; // days
}

export function NetflixStatsPanel({
  totalLessons,
  completedLessons,
  totalModules,
  completedModules,
  totalWatchTime = 0,
  currentStreak = 0,
}: NetflixStatsPanelProps) {
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const stats = [
    {
      icon: CheckCircle2,
      label: 'Aulas Completas',
      value: completedLessons,
      total: totalLessons,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      icon: BookOpen,
      label: 'Módulos',
      value: completedModules,
      total: totalModules,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
    {
      icon: Clock,
      label: 'Tempo Assistido',
      value: formatWatchTime(totalWatchTime),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      icon: Flame,
      label: 'Sequência',
      value: currentStreak,
      suffix: 'dias',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="h-full flex flex-col"
    >
      {/* Main Progress Card */}
      <div 
        className="rounded-2xl p-6 mb-4 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(30 20% 18% / 0.9) 0%, hsl(30 15% 12% / 0.95) 100%)',
          border: '1px solid hsl(30 20% 25% / 0.5)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Seu Progresso</h3>
            <p className="text-xs text-white/50">Continue assim!</p>
          </div>
        </div>
        
        <div className="relative mb-4">
          <Progress 
            value={progressPercentage} 
            className="h-3 bg-white/10"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-white/50">{completedLessons} de {totalLessons} aulas</span>
            <span className="text-sm font-bold text-amber-400">{progressPercentage}%</span>
          </div>
        </div>

        {/* Motivational message */}
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'hsl(30 20% 15% / 0.6)' }}
        >
          <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-xs text-white/70">
            {progressPercentage === 0 
              ? 'Comece sua jornada agora!' 
              : progressPercentage < 25 
                ? 'Ótimo começo! Continue assistindo.' 
                : progressPercentage < 50 
                  ? 'Você está progredindo bem!' 
                  : progressPercentage < 75 
                    ? 'Mais da metade concluída!' 
                    : progressPercentage < 100 
                      ? 'Quase lá! Falta pouco!' 
                      : 'Parabéns! Curso concluído! 🎉'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="rounded-xl p-4 backdrop-blur-xl flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, hsl(30 20% 18% / 0.8) 0%, hsl(30 15% 14% / 0.9) 100%)',
              border: '1px solid hsl(30 20% 25% / 0.4)',
            }}
          >
            <div className={`p-2 rounded-lg ${stat.bgColor} w-fit mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-white">{stat.value}</span>
                {stat.total && (
                  <span className="text-sm text-white/40">/{stat.total}</span>
                )}
                {stat.suffix && (
                  <span className="text-xs text-white/40">{stat.suffix}</span>
                )}
              </div>
              <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
