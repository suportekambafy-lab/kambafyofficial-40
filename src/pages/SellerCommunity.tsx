import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { PageLayout } from "@/components/PageLayout";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ThumbsUp, Eye, Plus, Search, TrendingUp, Clock, Image as ImageIcon, X, Loader2, Trash2, Heart, Share2, Bookmark, Award, Sparkles, Users, CheckCircle2, Crown, Flame } from "lucide-react";
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
  attachments?: {
    url: string;
    name: string;
  }[];
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}
const categoryLabels: Record<Category, {
  label: string;
  color: string;
  icon: any;
}> = {
  duvidas: {
    label: "Dúvidas",
    color: "bg-blue-500",
    icon: MessageSquare
  },
  dicas: {
    label: "Dicas",
    color: "bg-green-500",
    icon: Sparkles
  },
  novidades: {
    label: "Novidades",
    color: "bg-purple-500",
    icon: Flame
  },
  produtos: {
    label: "Produtos",
    color: "bg-orange-500",
    icon: Award
  },
  marketing: {
    label: "Marketing",
    color: "bg-pink-500",
    icon: TrendingUp
  },
  tecnologia: {
    label: "Tecnologia",
    color: "bg-cyan-500",
    icon: Crown
  },
  geral: {
    label: "Geral",
    color: "bg-gray-500",
    icon: Users
  }
};
export default function SellerCommunity() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [communityStats, setCommunityStats] = useState({
    totalMembers: 0,
    totalPosts: 0,
    todayPosts: 0,
    activeNow: 0
  });
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [previewStats, setPreviewStats] = useState({
    members: 0,
    posts: 0,
    active: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "geral" as Category
  });

  // Carregar stats mesmo sem login
  useEffect(() => {
    const loadPreviewStats = async () => {
      try {
        const {
          count: membersCount
        } = await supabase.from('profiles').select('*', {
          count: 'exact',
          head: true
        });
        const {
          count: postsCount
        } = await supabase.from('community_posts').select('*', {
          count: 'exact',
          head: true
        });
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const {
          data: recentPosts
        } = await supabase.from('community_posts').select('user_id').gte('created_at', yesterday.toISOString());
        const activeNow = new Set(recentPosts?.map(p => p.user_id) || []).size;
        setPreviewStats({
          members: membersCount || 0,
          posts: postsCount || 0,
          active: activeNow
        });
      } catch (error) {
        console.error('Error loading preview stats:', error);
      }
    };
    loadPreviewStats();
  }, []);

  // Verificar autenticação
  if (!user) {
    return <PageLayout title="Comunidade">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="flex flex-col items-center justify-center py-16 space-y-6">
          <motion.div initial={{
          scale: 0
        }} animate={{
          scale: 1
        }} transition={{
          delay: 0.2
        }} className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </motion.div>
          <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.3
        }} className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bem-vindo à Comunidade Kambafy
            </h2>
            <p className="text-muted-foreground max-w-md text-lg">
              Faça login para conectar-se com outros criadores, compartilhar experiências e crescer juntos.
            </p>
          </motion.div>
          <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.4
        }}>
            <Button size="lg" className="gap-2" onClick={() => window.location.href = '/auth'}>
              <Crown className="w-5 h-5" />
              Entrar na Comunidade
            </Button>
          </motion.div>

          {/* Stats Preview com dados reais */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.5
        }} className="grid grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{previewStats.members > 0 ? previewStats.members : '...'}</div>
              <div className="text-sm text-muted-foreground">Membros</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{previewStats.posts > 0 ? previewStats.posts : '...'}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{previewStats.active > 0 ? previewStats.active : '...'}</div>
              <div className="text-sm text-muted-foreground">Online Hoje</div>
            </div>
          </motion.div>
        </motion.div>
      </PageLayout>;
  }
  useEffect(() => {
    if (user) {
      loadPosts();
      loadCommunityStats();
      loadUserPreferences();
    }
    const channel = supabase.channel('community_posts_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'community_posts'
    }, () => {
      loadPosts();
      loadCommunityStats();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedCategory, sortBy]);
  const loadCommunityStats = async () => {
    try {
      // Número real de usuários cadastrados no Kambafy
      const {
        count: membersCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      });

      // Total de posts na comunidade
      const {
        count: postsCount
      } = await supabase.from('community_posts').select('*', {
        count: 'exact',
        head: true
      });

      // Posts criados hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const {
        count: todayCount
      } = await supabase.from('community_posts').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', today.toISOString());

      // Usuários ativos (que postaram nas últimas 24h)
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const {
        data: recentPosts
      } = await supabase.from('community_posts').select('user_id').gte('created_at', yesterday.toISOString());
      const activeNow = new Set(recentPosts?.map(p => p.user_id) || []).size;
      setCommunityStats({
        totalMembers: membersCount || 0,
        totalPosts: postsCount || 0,
        todayPosts: todayCount || 0,
        activeNow: activeNow
      });
    } catch (error) {
      console.error('Error loading community stats:', error);
    }
  };
  const loadUserPreferences = async () => {
    if (!user) return;
    const saved = localStorage.getItem(`saved_posts_${user.id}`);
    if (saved) setSavedPosts(JSON.parse(saved));
    try {
      const {
        data: likesData
      } = await supabase.from('community_likes').select('post_id').eq('user_id', user.id);
      if (likesData) {
        setLikedPosts(likesData.map(l => l.post_id));
      }
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };
  const toggleSavePost = (postId: string) => {
    const newSaved = savedPosts.includes(postId) ? savedPosts.filter(id => id !== postId) : [...savedPosts, postId];
    setSavedPosts(newSaved);
    localStorage.setItem(`saved_posts_${user?.id}`, JSON.stringify(newSaved));
    toast({
      title: savedPosts.includes(postId) ? "Post removido" : "Post salvo!",
      description: savedPosts.includes(postId) ? "Removido da sua coleção" : "Adicionado à sua coleção"
    });
  };
  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase.from('community_posts').select('*');
      if (selectedCategory !== "all") {
        query = query.eq('category', selectedCategory);
      }
      if (sortBy === "recent") {
        query = query.order('created_at', {
          ascending: false
        });
      } else {
        query = query.order('likes_count', {
          ascending: false
        });
      }
      const {
        data: postsData,
        error
      } = await query.limit(50);
      if (error) throw error;
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const {
          data: profilesData
        } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        const postsWithProfiles = postsData.map(post => ({
          ...post,
          attachments: post.attachments as {
            url: string;
            name: string;
          }[] | undefined,
          profiles: profilesMap.get(post.user_id) || {
            full_name: null,
            avatar_url: null
          }
        }));
        setPosts(postsWithProfiles);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isUnder5MB = file.size <= 5 * 1024 * 1024;
      if (!isImage || !isUnder5MB) {
        toast({
          title: "Erro",
          description: !isImage ? "Apenas imagens" : "Máximo 5MB",
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
  const uploadFiles = async (): Promise<{
    url: string;
    name: string;
  }[]> => {
    if (uploadingFiles.length === 0) return [];
    const uploadedFiles: {
      url: string;
      name: string;
    }[] = [];
    for (const file of uploadingFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const {
        error
      } = await supabase.storage.from('community-attachments').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (error) continue;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('community-attachments').getPublicUrl(fileName);
      uploadedFiles.push({
        url: publicUrl,
        name: file.name
      });
    }
    return uploadedFiles;
  };
  const handleCreatePost = async () => {
    if (!user || !newPost.title || !newPost.content) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    try {
      setUploadProgress(true);
      const attachments = await uploadFiles();
      const {
        error
      } = await supabase.from('community_posts').insert({
        user_id: user.id,
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        attachments: attachments
      });
      if (error) throw error;
      toast({
        title: "Post criado!",
        description: "Publicado na comunidade"
      });
      setNewPost({
        title: "",
        content: "",
        category: "geral"
      });
      setUploadingFiles([]);
      setIsDialogOpen(false);
      loadPosts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar post",
        variant: "destructive"
      });
    } finally {
      setUploadProgress(false);
    }
  };
  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const {
        data: existingLike
      } = await supabase.from('community_likes').select('id').eq('user_id', user.id).eq('post_id', postId).single();
      if (existingLike) {
        await supabase.from('community_likes').delete().eq('id', existingLike.id);
        setLikedPosts(likedPosts.filter(id => id !== postId));
      } else {
        await supabase.from('community_likes').insert({
          user_id: user.id,
          post_id: postId
        });
        setLikedPosts([...likedPosts, postId]);
      }
      loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };
  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      const {
        error
      } = await supabase.from('community_posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: "Post deletado",
        description: "Removido com sucesso"
      });
      loadPosts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar",
        variant: "destructive"
      });
    }
  };
  const handleSharePost = (post: Post) => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content.substring(0, 100),
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "Compartilhe com outros criadores"
      });
    }
  };
  const filteredPosts = posts.filter(post => post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.content.toLowerCase().includes(searchQuery.toLowerCase()));
  return <PageLayout title="Comunidade">
      <div className="space-y-6">
        {/* Header com Stats */}
        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                
                Comunidade Kambafy
              </h2>
              <p className="text-muted-foreground mt-1">
                Conecte-se, aprenda e cresça com outros criadores
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Criar Novo Post
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título</label>
                    <Input placeholder="Digite um título atrativo" value={newPost.title} onChange={e => setNewPost({
                    ...newPost,
                    title: e.target.value
                  })} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <Select value={newPost.category} onValueChange={value => setNewPost({
                    ...newPost,
                    category: value as Category
                  })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, {
                        label,
                        icon: Icon
                      }]) => <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {label}
                            </span>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Conteúdo</label>
                    <Textarea placeholder="Compartilhe sua experiência, dúvida ou dica..." className="min-h-[200px]" value={newPost.content} onChange={e => setNewPost({
                    ...newPost,
                    content: e.target.value
                  })} />
                  </div>

                  {uploadingFiles.length > 0 && <div className="flex flex-wrap gap-2">
                      {uploadingFiles.map((file, index) => <motion.div key={index} initial={{
                    scale: 0
                  }} animate={{
                    scale: 1
                  }} className="relative group">
                          <img src={URL.createObjectURL(file)} alt={file.name} className="h-24 w-24 object-cover rounded-lg border-2" />
                          <button onClick={() => removeFile(index)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </button>
                        </motion.div>)}
                    </div>}

                  <div className="flex gap-2 justify-between pt-4">
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadProgress}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Anexar Imagens
                      </Button>
                    </div>

                    <Button onClick={handleCreatePost} disabled={uploadProgress || !newPost.title || !newPost.content}>
                      {uploadProgress ? <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publicando...
                        </> : <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Publicar
                        </>}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[{
            label: "Membros",
            value: communityStats.totalMembers,
            icon: Users,
            color: "text-blue-500"
          }, {
            label: "Posts",
            value: communityStats.totalPosts,
            icon: MessageSquare,
            color: "text-green-500"
          }, {
            label: "Hoje",
            value: communityStats.todayPosts,
            icon: Flame,
            color: "text-orange-500"
          }, {
            label: "Online",
            value: communityStats.activeNow,
            icon: Crown,
            color: "text-purple-500"
          }].map((stat, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: i * 0.1
          }} className="text-center p-3 rounded-xl bg-background/50 backdrop-blur">
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>)}
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar posts..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <Select value={selectedCategory} onValueChange={v => setSelectedCategory(v as Category | "all")}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {Object.entries(categoryLabels).map(([key, {
              label
            }]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={v => setSortBy(v as "recent" | "popular")}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recentes
                </span>
              </SelectItem>
              <SelectItem value="popular">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Populares
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Posts Grid */}
        {loading ? <PageSkeleton variant="list" /> : filteredPosts.length === 0 ? <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} className="text-center py-12 space-y-3">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              {searchQuery ? "Nenhum post encontrado" : "Seja o primeiro a postar!"}
            </p>
          </motion.div> : <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, index) => {
            const CategoryIcon = categoryLabels[post.category].icon;
            const isLiked = likedPosts.includes(post.id);
            const isSaved = savedPosts.includes(post.id);
            return <motion.div key={post.id} layout initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              scale: 0.9
            }} transition={{
              delay: index * 0.05
            }} onHoverStart={() => setHoveredPost(post.id)} onHoverEnd={() => setHoveredPost(null)}>
                    <Card className={`overflow-hidden transition-all duration-300 ${hoveredPost === post.id ? 'shadow-lg scale-[1.01]' : ''}`}>
                      <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <HoverCard>
                            <HoverCardTrigger>
                              <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20">
                                <AvatarImage src={post.profiles?.avatar_url || ''} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                                  {post.profiles?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="flex gap-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={post.profiles?.avatar_url || ''} />
                                  <AvatarFallback>{post.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <h4 className="text-sm font-semibold flex items-center gap-1">
                                    {post.profiles?.full_name || 'Usuário Kambafy'}
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Membro da comunidade Kambafy
                                  </p>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">
                                {post.profiles?.full_name || 'Usuário Kambafy'}
                              </p>
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                              </span>
                            </div>
                            <Badge className={`${categoryLabels[post.category].color} text-white gap-1`}>
                              <CategoryIcon className="w-3 h-3" />
                              {categoryLabels[post.category].label}
                            </Badge>
                          </div>

                          {user && user.id === post.user_id && <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>}
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                          <h3 className="text-xl font-bold">{post.title}</h3>
                          <p className="text-muted-foreground line-clamp-3">{post.content}</p>

                          {/* Attachments */}
                          {post.attachments && post.attachments.length > 0 && <div className="grid grid-cols-2 gap-2 mt-3">
                              {post.attachments.slice(0, 4).map((attachment, idx) => <motion.img key={idx} whileHover={{
                        scale: 1.02
                      }} src={attachment.url} alt={attachment.name} className="w-full h-40 object-cover rounded-lg cursor-pointer" onClick={() => window.open(attachment.url, '_blank')} />)}
                            </div>}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <motion.button whileHover={{
                      scale: 1.05
                    }} whileTap={{
                      scale: 0.95
                    }} onClick={() => handleLike(post.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isLiked ? 'bg-red-500/10 text-red-500' : 'hover:bg-muted'}`}>
                            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                            <span className="text-sm font-medium">{post.likes_count}</span>
                          </motion.button>

                          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-muted transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm font-medium">{post.comments_count}</span>
                          </button>

                          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-muted transition-colors">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">{post.views_count}</span>
                          </button>

                          <div className="flex-1" />

                          <motion.button whileHover={{
                      scale: 1.05
                    }} whileTap={{
                      scale: 0.95
                    }} onClick={() => toggleSavePost(post.id)} className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                          </motion.button>

                          <motion.button whileHover={{
                      scale: 1.05
                    }} whileTap={{
                      scale: 0.95
                    }} onClick={() => handleSharePost(post)} className="p-2 rounded-full hover:bg-muted transition-colors">
                            <Share2 className="h-4 w-4" />
                          </motion.button>
                        </div>

                        {/* Comments Section */}
                        <div className="mt-4">
                          <PostComments postId={post.id} commentsCount={post.comments_count} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>;
          })}
            </AnimatePresence>
          </div>}
      </div>
    </PageLayout>;
}