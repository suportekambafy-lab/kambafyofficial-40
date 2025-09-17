import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Award } from 'lucide-react';
import { useState } from 'react';

interface LessonRatingProps {
  userRating: number;
  onRating: (rating: number) => void;
}

export function LessonRating({ userRating, onRating }: LessonRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const ratingLabels = [
    '',
    'Ruim',
    'Regular', 
    'Bom',
    'Muito Bom',
    'Excelente'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Avalie esta Aula
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Sua avaliação nos ajuda a melhorar o conteúdo
          </p>
          
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => {
              const isActive = i < (hoverRating || userRating);
              return (
                <Star 
                  key={i} 
                  className={`w-8 h-8 cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'fill-yellow-400 text-yellow-400 scale-110' 
                      : 'text-muted-foreground hover:text-yellow-400 hover:scale-105'
                  }`}
                  onClick={() => onRating(i + 1)}
                  onMouseEnter={() => setHoverRating(i + 1)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              );
            })}
          </div>

          {(hoverRating || userRating) > 0 && (
            <div className="space-y-2">
              <Badge variant="secondary" className="text-sm">
                {ratingLabels[hoverRating || userRating]}
              </Badge>
              {userRating > 0 && !hoverRating && (
                <p className="text-xs text-muted-foreground">
                  Obrigado pela sua avaliação!
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}