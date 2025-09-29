import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Home, ShoppingCart, Users, Settings, Shield, Smartphone, CreditCard, BookOpen, HelpCircle } from 'lucide-react';

const DevRoutes = () => {
  const routeCategories = [
    {
      title: "Páginas Principais",
      icon: <Home className="w-4 h-4" />,
      routes: [
        { path: "/", name: "Página Inicial", description: "Landing page principal" },
        { path: "/como-funciona", name: "Como Funciona", description: "Explicação da plataforma" },
        { path: "/precos", name: "Preços", description: "Planos e preços" },
        { path: "/recursos", name: "Recursos", description: "Funcionalidades" },
        { path: "/ajuda", name: "Ajuda", description: "Centro de ajuda" },
        { path: "/contato", name: "Contato", description: "Formulário de contato" },
      ]
    },
    {
      title: "Autenticação",
      icon: <Shield className="w-4 h-4" />,
      routes: [
        { path: "/auth", name: "Login/Cadastro", description: "Página de autenticação" },
        { path: "/reset-password", name: "Redefinir Senha", description: "Reset de senha" },
      ]
    },
    {
      title: "Checkout e Pagamentos",
      icon: <ShoppingCart className="w-4 h-4" />,
      routes: [
        { path: "/checkout/lista-de-100-produtos-vencedores", name: "Checkout - Lista 100 Produtos", description: "5.900 KZ" },
        { path: "/checkout/acesso-vitalicio", name: "Checkout - Acesso Vitalício", description: "9.900 KZ" },
        { path: "/checkout/marca-milionaria", name: "Checkout - Marca Milionária", description: "45.000 KZ" },
        { path: "/obrigado", name: "Página de Obrigado", description: "Após compra bem-sucedida" },
      ]
    },
    {
      title: "Painel do Vendedor",
      icon: <Users className="w-4 h-4" />,
      routes: [
        { path: "/vendedor", name: "Dashboard Vendedor", description: "Painel principal do vendedor" },
        { path: "/vendedor/produtos", name: "Meus Produtos", description: "Gerenciar produtos" },
        { path: "/vendedor/vendas", name: "Minhas Vendas", description: "Relatórios de vendas" },
        { path: "/vendedor/financeiro", name: "Financeiro", description: "Controle financeiro" },
        { path: "/apps", name: "Aplicações", description: "Integrações e apps" },
        { path: "/meus-afiliados", name: "Meus Afiliados", description: "Programa de afiliados" },
      ]
    },
    {
      title: "Painel do Cliente",
      icon: <CreditCard className="w-4 h-4" />,
      routes: [
        { path: "/minhas-compras", name: "Meus Acessos", description: "Histórico de acessos" },
        { path: "/identidade", name: "Verificação de Identidade", description: "Verificar identidade" },
      ]
    },
    {
      title: "Área de Membros",
      icon: <BookOpen className="w-4 h-4" />,
      routes: [
        { path: "/login/exemplo-area", name: "Login Área de Membros", description: "Login para área de membros (exemplo)" },
        { path: "/area/exemplo-area", name: "Área de Membros", description: "Conteúdo da área de membros (exemplo)" },
        { path: "/area/exemplo-area/content", name: "Conteúdo", description: "Conteúdo educacional" },
        { path: "/area/exemplo-area/support-materials", name: "Materiais de Apoio", description: "Downloads e recursos" },
        { path: "/area/exemplo-area/about", name: "Sobre", description: "Informações sobre o curso" },
      ]
    },
    {
      title: "Painel Administrativo",
      icon: <Settings className="w-4 h-4" />,
      routes: [
        { path: "/admin/login", name: "Login Admin", description: "Login administrativo" },
        { path: "/admin", name: "Dashboard Admin", description: "Painel administrativo" },
        { path: "/admin/products", name: "Produtos", description: "Gerenciar todos os produtos" },
        { path: "/admin/users", name: "Usuários", description: "Gerenciar usuários" },
        { path: "/admin/sellers", name: "Vendedores", description: "Gerenciar vendedores" },
        { path: "/admin/withdrawals", name: "Saques", description: "Aprovação de saques" },
      ]
    },
    {
      title: "Mobile e Especiais",
      icon: <Smartphone className="w-4 h-4" />,
      routes: [
        { path: "/mobile", name: "Interface Mobile", description: "Versão mobile otimizada" },
        { path: "/kambapay", name: "KambaPay", description: "Sistema de pagamento próprio" },
        { path: "/recuperacao-vendas", name: "Recuperação de Vendas", description: "Sistema de recovery" },
      ]
    },
    {
      title: "Páginas Legais",
      icon: <HelpCircle className="w-4 h-4" />,
      routes: [
        { path: "/privacidade", name: "Política de Privacidade", description: "Termos de privacidade" },
        { path: "/termos", name: "Termos de Uso", description: "Termos e condições" },
        { path: "/cookies", name: "Política de Cookies", description: "Uso de cookies" },
        { path: "/status", name: "Status da Plataforma", description: "Status dos serviços" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            🚀 Navegador de Rotas - Desenvolvimento
          </h1>
          <p className="text-muted-foreground">
            Todas as rotas disponíveis na aplicação organizadas por categoria para fácil navegação durante o desenvolvimento.
          </p>
          <Badge variant="secondary" className="mt-2">
            Total: {routeCategories.reduce((acc, cat) => acc + cat.routes.length, 0)} rotas
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {routeCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {category.icon}
                  {category.title}
                  <Badge variant="outline" className="ml-auto">
                    {category.routes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {category.routes.map((route, routeIndex) => (
                  <div key={routeIndex} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {route.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {route.description}
                        </p>
                        <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                          {route.path}
                        </code>
                      </div>
                      <Link to={route.path}>
                        <Button size="sm" variant="outline" className="flex-shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 border rounded-lg bg-muted/20">
          <h3 className="font-semibold mb-2">💡 Dicas de Uso:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Clique no botão <ExternalLink className="w-3 h-3 inline" /> para navegar para qualquer rota</li>
            <li>• As rotas de checkout já possuem produtos reais configurados para teste</li>
            <li>• Rotas admin requerem login administrativo</li>
            <li>• Área de membros funciona diretamente na pré-visualização</li>
            <li>• Para voltar aqui, acesse <code>/dev-routes</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DevRoutes;