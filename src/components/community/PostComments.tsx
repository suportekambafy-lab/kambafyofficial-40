import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MessageSquare, 
  ThumbsUp, 
  Image as ImageIcon, 
  X,
  Loader2,
  Send,
  Trash2
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  likes_count: number;
  created_at: string;
  user_id: string;
  attachments?: { url: string; name: string }[];
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface PostCommentsProps {
  postId: string;
  commentsCount: number;
}

export function PostComments({ postId, commentsCount }: PostCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadComments();
      
      // Realtime para comentários
      const channel = supabase
        .channel(`comments-${postId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_comments',
            filter: `post_id=eq.${postId}`
          },
          () => {
            loadComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const { data: commentsData, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          attachments: comment.attachments as { url: string; name: string }[] | undefined,
          profiles: profilesMap.get(comment.user_id) || { full_name: null, avatar_url: null }
        }));

        setComments(commentsWithProfiles);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isUnder5MB = file.size <= 5 * 1024 * 1024;
      
      if (!isImage) {
        toast({
          title: "Erro",
          description: "Apenas imagens são permitidas",
          variant: "destructive"
        });
        return false;
      }
      
      if (!isUnder5MB) {
        toast({
          title: "Erro",
          description: `${file.name} excede 5MB`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    setUploadingFiles([...uploadingFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadingFiles(uploadingFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<{ url: string; name: string }[]> => {
    if (uploadingFiles.length === 0) return [];

    const uploadedFiles: { url: string; name: string }[] = [];

    for (const file of uploadingFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('community-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Erro",
          description: `Erro ao fazer upload de ${file.name}`,
          variant: "destructive"
        });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('community-attachments')
        .getPublicUrl(fileName);

      uploadedFiles.push({
        url: publicUrl,
        name: file.name
      });
    }

    return uploadedFiles;
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para comentar",
        variant: "destructive"
      });
      return;
    }

    if (!newComment.trim() && uploadingFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Escreva um comentário ou anexe uma imagem",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadProgress(true);

      // Upload de arquivos se houver
      const attachments = await uploadFiles();

      // Criar comentário
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment,
          attachments: attachments
        });

      if (error) throw error;

      toast({
        title: "Comentário publicado!",
        description: "Seu comentário foi adicionado"
      });

      setNewComment("");
      setUploadingFiles([]);
      loadComments();
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Erro",
        description: "Erro ao publicar comentário",
        variant: "destructive"
      });
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Comentário deletado",
        description: "Seu comentário foi removido"
      });

      loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar comentário",
        variant: "destructive"
      });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para curtir",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: existingLike } = await supabase
        .from('community_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .single();

      if (existingLike) {
        await supabase
          .from('community_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        await supabase
          .from('community_likes')
          .insert({
            user_id: user.id,
            comment_id: commentId
          });
      }

      loadComments();
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        {commentsCount} {commentsCount === 1 ? 'comentário' : 'comentários'}
      </Button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Lista de comentários */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {comment.profiles?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.profiles?.full_name || 'Vendedor'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>

                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

                        {/* Anexos */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {comment.attachments.map((attachment, index) => (
                              <a
                                key={index}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="h-32 w-auto object-cover rounded border hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikeComment(comment.id)}
                            className="gap-2 -ml-2"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            {comment.likes_count}
                          </Button>

                          {user && user.id === comment.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Deletar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Formulário de novo comentário */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea
                placeholder="Escreva seu comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />

              {/* Preview de arquivos */}
              {uploadingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-20 w-20 object-cover rounded border"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadProgress}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Anexar Imagem
                </Button>

                <Button
                  onClick={handleSubmitComment}
                  disabled={uploadProgress || (!newComment.trim() && uploadingFiles.length === 0)}
                  className="ml-auto"
                >
                  {uploadProgress ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Comentar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
