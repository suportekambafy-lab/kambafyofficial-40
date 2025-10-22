import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MessageSquare, 
  ThumbsUp, 
  Eye, 
  Plus,
  Search,
  TrendingUp,
  Clock,
  Image as ImageIcon,
  X,
  Loader2,
  Trash2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PostComments } from "@/components/community/PostComments";

type Category = 'duvidas' | 'dicas' | 'novidades' | 'produtos' | 'marketing' | 'tecnologia' | 'geral';

interface Post {
  id: string;
  title: string;
  content: string;
  category: Category;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  user_id: string;
  attachments?: { url: string; name: string }[];
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const categoryLabels: Record<Category, { label: string; color: string }> = {
  duvidas: { label: "Dúvidas", color: "bg-blue-500" },
  dicas: { label: "Dicas", color: "bg-green-500" },
  novidades: { label: "Novidades", color: "bg-purple-500" },
  produtos: { label: "Produtos", color: "bg-orange-500" },
  marketing: { label: "Marketing", color: "bg-pink-500" },
  tecnologia: { label: "Tecnologia", color: "bg-cyan-500" },
  geral: { label: "Geral", color: "bg-gray-500" }
};

export default function SellerCommunity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "geral" as Category
  });

  useEffect(() => {
    loadPosts();
    
    // Realtime para novos posts
    const channel = supabase
      .channel('community-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, sortBy]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('community_posts')
        .select('*');

      if (selectedCategory !== "all") {
        query = query.eq('category', selectedCategory);
      }

      if (sortBy === "recent") {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('likes_count', { ascending: false });
      }

      const { data: postsData, error } = await query.limit(50);

      if (error) throw error;
      
      // Buscar perfis dos usuários
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        
        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );
        
        const postsWithProfiles = postsData.map(post => ({
          ...post,
          attachments: post.attachments as { url: string; name: string }[] | undefined,
          profiles: profilesMap.get(post.user_id) || { full_name: null, avatar_url: null }
        }));
        
        setPosts(postsWithProfiles);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar posts da comunidade",
        variant: "destructive"
      });
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

      const { error: uploadError } = await supabase.storage
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

  const handleCreatePost = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar um post",
        variant: "destructive"
      });
      return;
    }

    if (!newPost.title || !newPost.content) {
      toast({
        title: "Erro",
        description: "Preencha título e conteúdo",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadProgress(true);

      // Upload de arquivos se houver
      const attachments = await uploadFiles();

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          title: newPost.title,
          content: newPost.content,
          category: newPost.category,
          attachments: attachments
        });

      if (error) throw error;

      toast({
        title: "Post criado!",
        description: "Seu post foi publicado na comunidade"
      });

      setNewPost({ title: "", content: "", category: "geral" });
      setUploadingFiles([]);
      setIsDialogOpen(false);
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar post",
        variant: "destructive"
      });
    } finally {
      setUploadProgress(false);
    }
  };

  const handleViewPost = async (postId: string) => {
    try {
      // Incrementar visualização
      const { data: currentPost } = await supabase
        .from('community_posts')
        .select('views_count')
        .eq('id', postId)
        .single();

      if (currentPost) {
        await supabase
          .from('community_posts')
          .update({ views_count: currentPost.views_count + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para curtir",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verificar se já curtiu
      const { data: existingLike } = await supabase
        .from('community_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Descurtir
        await supabase
          .from('community_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Curtir
        await supabase
          .from('community_likes')
          .insert({
            user_id: user.id,
            post_id: postId
          });
      }

      loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Post deletado",
        description: "Seu post foi removido com sucesso"
      });

      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar post",
        variant: "destructive"
      });
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comunidade Kambafy</h1>
          <p className="text-muted-foreground mt-1">
            Conecte-se com outros criadores e compartilhe experiências
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  placeholder="Digite o título do seu post"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select 
                  value={newPost.category} 
                  onValueChange={(value) => setNewPost({...newPost, category: value as Category})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo</label>
                <Textarea
                  placeholder="Compartilhe sua experiência, dúvida ou dica..."
                  className="min-h-[200px]"
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                />
              </div>

              {/* Preview de arquivos */}
              {uploadingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-24 w-24 object-cover rounded border"
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

              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadProgress}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Anexar Imagens
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setUploadingFiles([]);
                    }}
                    disabled={uploadProgress}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreatePost}
                    disabled={uploadProgress}
                  >
                    {uploadProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      'Publicar'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar posts..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as Category | "all")}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(categoryLabels).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as "recent" | "popular")}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Mais recentes
              </div>
            </SelectItem>
            <SelectItem value="popular">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Mais populares
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum post encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Seja o primeiro a compartilhar algo com a comunidade!
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const categoryInfo = categoryLabels[post.category];
            
            return (
              <Card 
                key={post.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewPost(post.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          por {post.profiles?.full_name || 'Vendedor'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          • {formatDistanceToNow(new Date(post.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent onClick={(e) => e.stopPropagation()}>
                  <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                    {post.content.length > 300 
                      ? post.content.substring(0, 300) + '...' 
                      : post.content
                    }
                  </p>

                  {/* Anexos do post */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.attachments.map((attachment, index) => (
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
                            className="h-40 w-auto object-cover rounded border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className="gap-2"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {post.likes_count}
                    </Button>
                    
                    <PostComments postId={post.id} commentsCount={post.comments_count} />
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      {post.views_count}
                    </div>

                    {user && user.id === post.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
                        className="gap-2 text-destructive hover:text-destructive ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Deletar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
