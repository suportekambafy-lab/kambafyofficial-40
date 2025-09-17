import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send,
  User
} from 'lucide-react';
import { useState } from 'react';

interface Comment {
  id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface LessonCommentsProps {
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  onSubmitComment: () => void;
  isAuthenticated: boolean;
}

export function LessonComments({
  comments,
  newComment,
  setNewComment,
  onSubmitComment,
  isAuthenticated
}: LessonCommentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        {isAuthenticated && (
          <div className="space-y-3 pb-4 border-b border-border">
            <Textarea
              placeholder="Compartilhe suas dúvidas ou insights sobre esta aula..."
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
        )}

        {/* Comments List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">
                      {comment.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{comment.comment}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhum comentário ainda.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Seja o primeiro a compartilhar seus insights!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}