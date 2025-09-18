import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  BookOpen, 
  Play, 
  Settings, 
  CreditCard, 
  Shield, 
  HelpCircle,
  ChevronRight,
  Video,
  Download,
  Users
} from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useState } from 'react';
import { SEO } from '@/components/SEO';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function MemberAreaHelp() {
  const { student, memberArea, loading } = useMemberAreaAuth();
  const navigate = useNavigate();
  const { id: areaId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student || !memberArea) {
    navigate(`/login/${areaId}`);
    return null;
  }

  const helpCategories = [
    {
      icon: Play,
      title: "Começando",
      description: "Primeiros passos na plataforma",
      articles: 12,
      color: "bg-blue-500"
    },
    {
      icon: Video,
      title: "Aulas e Vídeos",
      description: "Como assistir e navegar pelo conteúdo",
      articles: 8,
      color: "bg-green-500"
    },
    {
      icon: Download,
      title: "Downloads",
      description: "Baixar materiais e recursos",
      articles: 5,
      color: "bg-purple-500"
    },
    {
      icon: Settings,
      title: "Configurações",
      description: "Personalizar sua conta",
      articles: 7,
      color: "bg-orange-500"
    },
    {
      icon: CreditCard,
      title: "Pagamentos",
      description: "Dúvidas sobre cobrança",
      articles: 6,
      color: "bg-pink-500"
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Privacidade e proteção",
      articles: 4,
      color: "bg-red-500"
    }
  ];

  const popularArticles = [
    {
      title: "Como acessar minha primeira aula?",
      category: "Começando",
      views: 1250,
      helpful: 89
    },
    {
      title: "Onde encontro os materiais para download?",
      category: "Downloads",
      views: 980,
      helpful: 92
    },
    {
      title: "Como alterar minha senha?",
      category: "Configurações",
      views: 756,
      helpful: 85
    },
    {
      title: "O vídeo não carrega, o que fazer?",
      category: "Aulas e Vídeos",
      views: 645,
      helpful: 78
    },
    {
      title: "Como acompanhar meu progresso?",
      category: "Começando",
      views: 534,
      helpful: 91
    }
  ];

  const quickTips = [
    {
      title: "Atalhos do teclado",
      description: "Use espaço para pausar/reproduzir vídeos",
      icon: "⌨️"
    },
    {
      title: "Modo escuro",
      description: "Ative nas configurações para melhor experiência noturna",
      icon: "🌙"
    },
    {
      title: "Velocidade de reprodução",
      description: "Acelere ou desacelere os vídeos conforme sua necessidade",
      icon: "⚡"
    },
    {
      title: "Notas pessoais",
      description: "Faça anotações durante as aulas para revisar depois",
      icon: "📝"
    }
  ];

  const filteredArticles = popularArticles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEO 
        title={`Central de Ajuda - ${memberArea?.name || 'Área de Membros'}`}
        description="Encontre respostas para suas dúvidas e aprenda a usar melhor a plataforma"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Central de Ajuda</h1>
            <p className="text-xl text-muted-foreground">
              Encontre respostas rápidas para suas dúvidas
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar na central de ajuda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>

          {/* Categories */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Categorias de Ajuda</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center`}>
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <Badge variant="secondary">
                      {category.articles} artigos
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Popular Articles */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    {searchTerm ? 'Resultados da Busca' : 'Artigos Populares'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredArticles.map((article, index) => (
                    <div key={index} className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold group-hover:text-primary transition-colors mb-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {article.category}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {article.views} visualizações
                            </span>
                            <span className="text-green-600">
                              {article.helpful}% útil
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))}
                  
                  {filteredArticles.length === 0 && searchTerm && (
                    <div className="text-center py-8">
                      <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">Nenhum resultado encontrado</h3>
                      <p className="text-muted-foreground">
                        Tente usar termos diferentes ou navegue pelas categorias
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Tips */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dicas Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quickTips.map((tip, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{tip.icon}</span>
                        <div>
                          <h4 className="font-semibold text-sm">{tip.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tip.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contact Support */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-primary">Ainda precisa de ajuda?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nossa equipe de suporte está pronta para ajudar você.
                  </p>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Email:</strong> suporte@exemplo.com
                    </div>
                    <div className="text-sm">
                      <strong>Horário:</strong> Seg-Sex, 9h-18h
                    </div>
                    <div className="text-sm">
                      <strong>Resposta:</strong> Até 24 horas
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}