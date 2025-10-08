import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
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
      className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer border-border/50"
      onClick={onClick}
    >
      {/* Imagem */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={memberAreaName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="w-12 h-12 text-primary/40" />
          </div>
        )}
        
        {/* Badge de status */}
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Nome do curso */}
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {memberAreaName}
        </h3>

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedLessons} de {totalLessons} aulas concluídas
          </p>
        </div>

        {/* Última atividade */}
        {lastActivity && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Última atividade: {formatDistanceToNow(new Date(lastActivity), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        )}

        {/* Botão de ação */}
        <Button 
          className="w-full" 
          variant={isCompleted ? "outline" : "default"}
        >
          {isCompleted ? 'Revisar Curso' : isInProgress ? 'Continuar' : 'Começar Curso'}
        </Button>
      </CardContent>
    </Card>
  );
}
