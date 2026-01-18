import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  ChevronLeft,
  Users,
  GraduationCap,
  CreditCard,
  Link as LinkIcon,
  Package,
  TrendingUp,
  BookOpen,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MessageCircle
} from "lucide-react";
import { 
  helpCategories, 
  helpArticles, 
  getArticleBySlug, 
  getArticlesByCategory,
  getRelatedArticles,
  searchArticles,
  HelpArticle,
  HelpCategory
} from "@/data/helpArticles";

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  GraduationCap,
  CreditCard,
  Link: LinkIcon,
  Package,
  TrendingUp
};

// Componente para renderizar markdown simples
const MarkdownContent = ({ content }: { content: string }) => {
  const lines = content.trim().split('\n');
  
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-foreground">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-6 mb-3 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        
        // Lists
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 text-muted-foreground list-disc">
              {line.slice(2)}
            </li>
          );
        }
        
        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\. (.+)/);
        if (numberedMatch) {
          return (
            <li key={index} className="ml-4 text-muted-foreground list-decimal">
              {numberedMatch[2]}
            </li>
          );
        }
        
        // Check/X items
        if (line.startsWith('- ✅') || line.startsWith('- ❌')) {
          return (
            <p key={index} className="ml-4 text-muted-foreground">
              {line.slice(2)}
            </p>
          );
        }
        
        // Tables
        if (line.startsWith('|')) {
          if (line.includes('---')) return null; // Skip separator
          const cells = line.split('|').filter(Boolean).map(c => c.trim());
          const isHeader = index > 0 && lines[index + 1]?.includes('---');
          return (
            <div key={index} className={`grid grid-cols-2 gap-4 py-2 px-4 ${isHeader ? 'font-semibold bg-muted/50 rounded-t-lg' : 'border-b'}`}>
              {cells.map((cell, i) => (
                <span key={i} className="text-muted-foreground">{cell}</span>
              ))}
            </div>
          );
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }
        
        // Regular paragraphs
        // Handle bold text
        const formattedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        return (
          <p 
            key={index} 
            className="text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        );
      })}
    </div>
  );
};

// Função para abrir o Crisp Chat
const openCrispChat = () => {
  if (window.$crisp) {
    window.$crisp.push(['do', 'chat:show']);
    window.$crisp.push(['do', 'chat:open']);
  }
};

export default function SellerDocumentation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const currentArticleSlug = searchParams.get('artigo');
  const currentCategorySlug = searchParams.get('categoria');

  const currentArticle = currentArticleSlug ? getArticleBySlug(currentArticleSlug) : null;
  const currentCategory = currentCategorySlug ? helpCategories.find(c => c.slug === currentCategorySlug) : null;
  
  const relatedArticles = currentArticle ? getRelatedArticles(currentArticle.id) : [];
  
  const categoryArticles = currentCategorySlug 
    ? getArticlesByCategory(currentCategorySlug) 
    : [];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchArticles(searchQuery);
  }, [searchQuery]);

  const handleArticleClick = (article: HelpArticle) => {
    setSearchParams({ artigo: article.slug, categoria: article.categorySlug });
    setSearchQuery("");
    setFeedback(null);
  };

  const handleCategoryClick = (category: HelpCategory) => {
    setSearchParams({ categoria: category.slug });
    setSearchQuery("");
  };

  const handleBack = () => {
    if (currentArticle) {
      setSearchParams({ categoria: currentArticle.categorySlug });
    } else {
      setSearchParams({});
    }
    setFeedback(null);
  };

  const handleBackToCategories = () => {
    setSearchParams({});
  };

  // View: Artigo específico
  if (currentArticle) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na Central de Ajuda"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-8">
            {/* Sidebar - Artigos relacionados */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
                  Artigos relacionados
                </h3>
                <nav className="space-y-1">
                  {relatedArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article)}
                      className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {article.title}
                    </button>
                  ))}
                </nav>

                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
                    Mais em {currentArticle.category}
                  </h3>
                  <nav className="space-y-1">
                    {getArticlesByCategory(currentArticle.categorySlug)
                      .filter(a => a.id !== currentArticle.id)
                      .slice(0, 5)
                      .map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleArticleClick(article)}
                          className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {article.title}
                        </button>
                      ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Conteúdo principal */}
            <main className="flex-1 min-w-0">
              <Card>
                <CardContent className="p-6 md:p-8">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <button 
                      onClick={handleBackToCategories}
                      className="hover:text-foreground"
                    >
                      Central de Ajuda
                    </button>
                    <span>/</span>
                    <button 
                      onClick={handleBack}
                      className="hover:text-foreground"
                    >
                      {currentArticle.category}
                    </button>
                  </div>

                  {/* Conteúdo do artigo */}
                  <MarkdownContent content={currentArticle.content} />

                  {/* Feedback */}
                  <div className="mt-12 pt-6 border-t">
                    <p className="text-sm text-muted-foreground mb-3">Este artigo foi útil?</p>
                    <div className="flex gap-2">
                      <Button 
                        variant={feedback === 'up' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFeedback('up')}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Sim
                      </Button>
                      <Button 
                        variant={feedback === 'down' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFeedback('down')}
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Não
                      </Button>
                    </div>
                    {feedback && (
                      <p className="text-sm text-muted-foreground mt-3">
                        Obrigado pelo feedback!
                      </p>
                    )}
                  </div>

                  {/* CTA suporte */}
                  <div className="mt-8 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">Não encontrou o que buscava?</p>
                      <p className="text-sm text-muted-foreground">Entre em contato com nosso suporte</p>
                    </div>
                    <Button onClick={openCrispChat}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Falar com suporte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // View: Lista de artigos de uma categoria
  if (currentCategory) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackToCategories}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na Central de Ajuda"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search results overlay */}
        {searchQuery && searchResults.length > 0 && (
          <div className="max-w-4xl mx-auto px-4">
            <Card className="mt-2 absolute z-50 w-full max-w-md">
              <CardContent className="p-2">
                {searchResults.slice(0, 5).map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="block w-full text-left px-3 py-2 rounded-lg hover:bg-muted"
                  >
                    <p className="font-medium text-sm">{article.title}</p>
                    <p className="text-xs text-muted-foreground">{article.category}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button 
              onClick={handleBackToCategories}
              className="hover:text-foreground"
            >
              Central de Ajuda
            </button>
            <span>/</span>
            <span className="text-foreground">{currentCategory.name}</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">{currentCategory.name}</h1>
          <p className="text-muted-foreground mb-8">{currentCategory.description}</p>

          {/* Lista de artigos */}
          <div className="space-y-2">
            {categoryArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between group"
              >
                <span className="font-medium">{article.title}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // View: Lista de categorias (home)
  return (
    <div className="min-h-screen bg-background">
      {/* Header com busca */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Central de Ajuda</h1>
          </div>
          <p className="text-muted-foreground mb-6">
            Encontre respostas para suas dúvidas sobre a plataforma
          </p>
          
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              className="pl-12 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {/* Search results dropdown */}
            {searchQuery && searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 mt-2 z-50">
                <CardContent className="p-2">
                  <ScrollArea className="max-h-64">
                    {searchResults.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => handleArticleClick(article)}
                        className="block w-full text-left px-3 py-2 rounded-lg hover:bg-muted"
                      >
                        <p className="font-medium text-sm">{article.title}</p>
                        <p className="text-xs text-muted-foreground">{article.category}</p>
                      </button>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Grid de categorias */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {helpCategories.map((category) => {
            const Icon = iconMap[category.icon] || BookOpen;
            const articleCount = getArticlesByCategory(category.slug).length;
            
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="text-left p-6 rounded-xl border hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                    <Badge variant="secondary" className="text-xs">
                      {articleCount} artigo{articleCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Artigos populares */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Artigos populares</h2>
          <div className="space-y-2">
            {helpArticles.slice(0, 5).map((article) => (
              <button
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="font-medium">{article.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{article.category}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* CTA Suporte */}
        <div className="mt-12 p-6 bg-muted/50 rounded-xl text-center">
          <h3 className="font-semibold mb-2">Não encontrou o que buscava?</h3>
          <p className="text-muted-foreground mb-4">Nossa equipe está pronta para ajudar</p>
          <Button onClick={openCrispChat}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Falar com suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
