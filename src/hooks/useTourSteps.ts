import { OnboardingStep } from './useOnboarding';

export const DASHBOARD_TOUR: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'dashboard-header',
    title: 'Bem-vindo ao seu Dashboard! 👋',
    description: 'Aqui você acompanha todas as suas vendas, receitas e métricas em tempo real. Vamos fazer um tour rápido?',
    placement: 'bottom',
  },
  {
    id: 'quick-filters',
    target: 'quick-filters',
    title: 'Filtros Rápidos ⚡',
    description: 'Use estes botões para filtrar suas vendas por período: Hoje, 7 dias, 30 dias ou ver tudo. É instantâneo!',
    placement: 'bottom',
  },
  {
    id: 'customize',
    target: 'widget-customizer',
    title: 'Personalize seu Dashboard 🎨',
    description: 'Clique aqui para escolher quais widgets aparecem no seu dashboard. Você também pode reorganizá-los arrastando!',
    placement: 'bottom',
  },
  {
    id: 'metrics',
    target: 'revenue-card',
    title: 'Suas Métricas 📊',
    description: 'Acompanhe sua receita e número de vendas. Clique no ícone de olho para ocultar/mostrar os valores.',
    placement: 'right',
  },
  {
    id: 'drag-drop',
    target: 'draggable-widget',
    title: 'Reorganize como Quiser 🔄',
    description: 'Passe o mouse sobre qualquer widget e arraste pela alça que aparece no topo para reorganizar!',
    placement: 'left',
  },
  {
    id: 'complete',
    target: 'dashboard-header',
    title: 'Tudo Pronto! 🎉',
    description: 'Você pode revisitar este tour a qualquer momento clicando no ícone de ajuda. Boa sorte com suas vendas!',
    placement: 'bottom',
  },
];

export const PRODUCTS_TOUR: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'products-header',
    title: 'Gerenciamento de Produtos 📦',
    description: 'Aqui você cria e gerencia todos os seus produtos digitais. Vamos conhecer as funcionalidades!',
    placement: 'bottom',
  },
  {
    id: 'create-product',
    target: 'create-product-btn',
    title: 'Criar Novo Produto ✨',
    description: 'Clique aqui para criar um novo produto. O processo é rápido e simples!',
    placement: 'bottom',
  },
  {
    id: 'product-list',
    target: 'products-list',
    title: 'Seus Produtos 📋',
    description: 'Veja todos os seus produtos aqui. Você pode editar, duplicar ou excluir rapidamente.',
    placement: 'top',
  },
  {
    id: 'filters',
    target: 'products-filters',
    title: 'Filtros e Busca 🔍',
    description: 'Use os filtros para encontrar produtos específicos rapidamente.',
    placement: 'bottom',
  },
];

export const SALES_TOUR: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'sales-header',
    title: 'Central de Vendas 💰',
    description: 'Acompanhe todas as suas vendas, afiliações e comissões em um só lugar!',
    placement: 'bottom',
  },
  {
    id: 'sales-list',
    target: 'sales-list',
    title: 'Histórico de Vendas 📊',
    description: 'Veja o histórico completo com detalhes de cada transação, incluindo comissões e status.',
    placement: 'top',
  },
  {
    id: 'filters',
    target: 'sales-filters',
    title: 'Filtre suas Vendas 🔍',
    description: 'Filtre por período, produto, status ou tipo de venda (própria ou afiliado).',
    placement: 'bottom',
  },
  {
    id: 'export',
    target: 'export-btn',
    title: 'Exportar Dados 📥',
    description: 'Exporte seus dados de vendas para Excel ou PDF para análises externas.',
    placement: 'left',
  },
];

export const FINANCIAL_TOUR: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'financial-header',
    title: 'Gestão Financeira 🏦',
    description: 'Controle seu saldo, saques e histórico financeiro completo!',
    placement: 'bottom',
  },
  {
    id: 'balance',
    target: 'balance-card',
    title: 'Seu Saldo Disponível 💵',
    description: 'Acompanhe seu saldo em tempo real. O saldo é atualizado automaticamente após cada venda.',
    placement: 'right',
  },
  {
    id: 'withdrawal',
    target: 'withdrawal-btn',
    title: 'Solicitar Saque 💸',
    description: 'Solicite saques do seu saldo disponível. O processamento é rápido e seguro!',
    placement: 'bottom',
  },
  {
    id: 'history',
    target: 'transactions-list',
    title: 'Histórico de Transações 📜',
    description: 'Veja todo o histórico de vendas, saques e movimentações financeiras.',
    placement: 'top',
  },
];

export function getTourSteps(tourId: string): OnboardingStep[] {
  switch (tourId) {
    case 'dashboard-tour':
      return DASHBOARD_TOUR;
    case 'products-tour':
      return PRODUCTS_TOUR;
    case 'sales-tour':
      return SALES_TOUR;
    case 'financial-tour':
      return FINANCIAL_TOUR;
    default:
      return DASHBOARD_TOUR;
  }
}
