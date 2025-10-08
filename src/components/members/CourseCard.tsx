import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Clock, PlayCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CourseCardProps {
  memberAreaId: string;
  memberAreaName: string;
  logoUrl?: string;
  heroImageUrl?: string;
  totalLessons: number;
  completedLessons: number;
  lastActivity?: string;
  onClick: () => void;
}

export function CourseCard({
  memberAreaName,
  logoUrl,
  heroImageUrl,
  totalLessons,
  completedLessons,
  lastActivity,
  onClick
}: CourseCardProps) {
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const isCompleted = progress === 100;
  const isInProgress = progress > 0 && progress < 100;
  const isNotStarted = progress === 0;

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <div className="backdrop-blur-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">Concluído</span>
        </div>
      );
    }
    if (isInProgress) {
      return (
        <div className="backdrop-blur-xl bg-[#00A651]/20 border border-[#00A651]/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#00A651]" />
          <span className="text-xs font-semibold text-[#00A651]">Em andamento</span>
        </div>
      );
    }
    return (
      <div className="backdrop-blur-xl bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500">Não iniciado</span>
      </div>
    );
  };

  const imageUrl = heroImageUrl || logoUrl;

  return (
    <div 
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-[#00A651]/30 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
      
      <div className="relative bg-[#18181b]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden hover:border-[#00A651]/30 transition-all duration-300">
        {/* Imagem */}
        <div className="relative h-52 overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
          
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={memberAreaName}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <BookOpen className="w-14 h-14 text-zinc-700 group-hover:scale-110 group-hover:text-[#00A651] transition-all duration-300" />
            </div>
          )}
          
          {/* Play icon overlay */}
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00A651] rounded-full blur-xl opacity-50" />
              <div className="relative p-4 rounded-full bg-[#00A651] backdrop-blur-sm border border-[#00A651]/30">
                <PlayCircle className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          
          {/* Badge de status */}
          <div className="absolute top-4 right-4 z-30">
            {getStatusBadge()}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Nome do curso */}
          <h3 className="font-bold text-xl text-white line-clamp-2 group-hover:text-[#00A651] transition-colors duration-300 min-h-[3.5rem]">
            {memberAreaName}
          </h3>

          {/* Progresso */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500 font-medium">Progresso</span>
              <span className="font-bold text-[#00A651] text-base">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="absolute inset-0 bg-[#00A651] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600 font-medium">
              {completedLessons} de {totalLessons} aulas
            </p>
          </div>

          {/* Última atividade */}
          {lastActivity && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/50 rounded-xl px-3 py-2.5 border border-white/5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {formatDistanceToNow(new Date(lastActivity), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          )}

          {/* Botão de ação */}
          <button 
            className={`w-full group/btn relative overflow-hidden rounded-xl px-6 py-3.5 font-semibold transition-all ${
              isCompleted 
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10' 
                : 'bg-[#00A651] hover:bg-[#00A651]/90 text-white shadow-lg shadow-[#00A651]/20 hover:shadow-[#00A651]/40'
            }`}
          >
            <span className="flex items-center justify-center gap-2 relative z-10">
              {isCompleted ? 'Revisar Curso' : isInProgress ? 'Continuar' : 'Começar Curso'}
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
