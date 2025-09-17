import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Send, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  Clock,
  BookOpen
} from 'lucide-react';
import { useState } from 'react';
import type { Lesson } from '@/types/memberArea';

interface LessonSidebarProps {
  lesson: Lesson;
  allLessons: Lesson[];
  comments: any[];
  newComment: string;
  setNewComment: (value: string) => void;
  userRating: number;
  lessonProgress: Record<string, any>;
  onSubmitComment: () => void;
  onRating: (rating: number) => void;
  onNavigateToLesson: (lessonId: string) => void;
  onNavigateToPrevious: () => void;
  onNavigateToNext: () => void;
  hasNextLesson: boolean;
  hasPreviousLesson: boolean;
}

export function LessonSidebar({
  lesson,
  allLessons,
  comments,
  newComment,
  setNewComment,
  userRating,
  lessonProgress,
  onSubmitComment,
  onRating,
  onNavigateToLesson,
  onNavigateToPrevious,
  onNavigateToNext,
  hasNextLesson,
  hasPreviousLesson
}: LessonSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Lesson Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Navegação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasPreviousLesson && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToPrevious}
              className="w-full justify-start gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground">Anterior</div>
                <div className="truncate">Aula anterior</div>
              </div>
            </Button>
          )}
          {hasNextLesson && (
            <Button
              size="sm"
              onClick={onNavigateToNext}
              className="w-full justify-start gap-2"
            >
              <div className="text-left flex-1">
                <div className="text-xs text-primary-foreground/80">Próxima</div>
                <div className="truncate">Próxima aula</div>
              </div>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lesson List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlayCircle className="w-5 h-5" />
            Lista de Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allLessons.map((lessonItem, index) => {
              const isCurrentLesson = lessonItem.id === lesson.id;
              const progress = lessonProgress[lessonItem.id];
              const isCompleted = progress?.completed || false;
              
              return (
                <Button
                  key={lessonItem.id}
                  variant={isCurrentLesson ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onNavigateToLesson(lessonItem.id)}
                  className="w-full justify-start gap-3 h-auto p-3"
                >
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="truncate font-medium">{lessonItem.title}</div>
                    {lessonItem.duration && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lessonItem.duration} min
                      </div>
                    )}
                  </div>
                  {progress?.progress_percentage > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {progress.progress_percentage}%
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Como você avalia esta aula?</p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-6 h-6 cursor-pointer transition-colors ${
                    i < userRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                  }`}
                  onClick={() => onRating(i + 1)}
                />
              ))}
            </div>
            {userRating > 0 && (
              <Badge variant="secondary" className="text-xs">
                Você avaliou com {userRating} estrela{userRating > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5" />
            Comentários ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment */}
          <div className="space-y-3">
            <Textarea
              placeholder="Adicione um comentário sobre esta aula..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button 
              onClick={onSubmitComment}
              disabled={!newComment.trim()}
              size="sm"
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Comentário
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">
                      {comment.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}