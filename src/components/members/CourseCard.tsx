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
        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Concluído
        </Badge>
      );
    }
    if (isInProgress) {
      return (
        <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Em andamento
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <BookOpen className="w-3 h-3 mr-1" />
        Não iniciado
      </Badge>
    );
  };

  const imageUrl = heroImageUrl || logoUrl;

  return (
    <Card 
      className="group overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30"
      onClick={onClick}
    >
      {/* Imagem */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={memberAreaName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
            <BookOpen className="w-12 h-12 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}
        
        {/* Play icon overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="p-4 rounded-full bg-primary/90 backdrop-blur-sm">
            <PlayCircle className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        {/* Badge de status */}
        <div className="absolute top-3 right-3 z-30">
          {getStatusBadge()}
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Nome do curso */}
        <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors duration-300 min-h-[3.5rem]">
          {memberAreaName}
        </h3>

        {/* Progresso */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progresso</span>
            <span className="font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="relative">
            <Progress 
              value={progress} 
              className="h-2.5 bg-muted/50" 
            />
            <div 
              className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {completedLessons} de {totalLessons} aulas concluídas
          </p>
        </div>

        {/* Última atividade */}
        {lastActivity && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
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
        <Button 
          className="w-full group/btn relative overflow-hidden" 
          variant={isCompleted ? "outline" : "default"}
        >
          <span className="flex items-center justify-center gap-2">
            {isCompleted ? 'Revisar Curso' : isInProgress ? 'Continuar Aprendendo' : 'Começar Curso'}
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
