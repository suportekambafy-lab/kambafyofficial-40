import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Language = 'pt' | 'en' | 'es';

// Traduções estáticas completas
const TRANSLATIONS: Record<Language, Record<string, string>> = {
  pt: {
    // Menu/Sidebar
    'menu.dashboard': 'Dashboard',
    'menu.products': 'Produtos',
    'menu.sales': 'Vendas',
    'menu.financial': 'Financeiro',
    'menu.memberAreas': 'Membros',
    'menu.modulePayments': 'Pagamentos Módulos',
    'menu.marketplace': 'Kamba Extra',
    'menu.affiliates': 'Afiliados',
    'menu.subscriptions': 'Assinaturas',
    'menu.refunds': 'Reembolsos',
    'menu.myAffiliations': 'Minhas Afiliações',
    'menu.myPurchases': 'Minhas Compras',
    'menu.apps': 'Apps',
    'menu.settings': 'Configurações',
    'menu.help': 'Ajuda',
    'menu.logout': 'Sair',
    'menu.liveView': 'Ao Vivo',
    'menu.reports': 'Relatórios',
    'menu.balance': 'Saldo',
    'menu.withdraw': 'Sacar',
    'menu.community': 'Comunidade',
    'menu.ranking': 'Ranking',
    'menu.collaborators': 'Colaboradores',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Acompanhe o desempenho do seu negócio',
    'dashboard.welcome': 'Bem-vindo de volta',
    'dashboard.totalSales': 'Total de Vendas',
    'dashboard.revenue': 'Receita',
    'dashboard.customers': 'Clientes',
    'dashboard.products': 'Produtos',
    'dashboard.recentSales': 'Vendas Recentes',
    'dashboard.topProducts': 'Produtos Mais Vendidos',

    // Products
    'products.title': 'Produtos',
    'products.new': 'Novo Produto',
    'products.edit': 'Editar Produto',
    'products.delete': 'Excluir Produto',
    'products.status': 'Status',
    'products.active': 'Ativo',
    'products.inactive': 'Inativo',
    'products.price': 'Preço',
    'products.sales': 'Vendas',

    // Sales
    'sales.title': 'Vendas',
    'sales.subtitle': 'Gerencie e acompanhe suas vendas',
    'sales.registered': 'vendas registradas',
    'sales.total': 'Total',
    'sales.pending': 'Pendente',
    'sales.completed': 'Concluída',
    'sales.cancelled': 'Cancelada',
    'sales.refunded': 'Reembolsada',
    'sales.approved': 'Aprovado',
    'sales.paidSales': 'Vendas Pagas',
    'sales.pendingSales': 'Vendas Pendentes',
    'sales.confirmed': 'vendas confirmadas',
    'sales.awaitingConfirmation': 'aguardando confirmação',

    // Financial
    'financial.title': 'Financeiro',
    'financial.balance': 'Saldo Disponível',
    'financial.pending': 'Pendente',
    'financial.withdraw': 'Solicitar Saque',
    'financial.transactions': 'Transações',

    // Common
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.create': 'Criar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.refresh': 'Atualizar',
    'common.back': 'Voltar',

    // Settings
    'settings.title': 'Configurações da Conta',
    'settings.subtitle': 'Gerencie suas informações pessoais e configurações',
    'settings.tab.profile': 'Perfil',
    'settings.tab.account': 'Conta',
    'settings.tab.security': 'Segurança',
    'settings.profile.title': 'Perfil Público',
    'settings.profile.photo': 'Foto de Perfil',
    'settings.profile.photo.hint': 'Clique na foto para alterar. Máximo 5MB.',
    'settings.profile.upload': 'Enviar Foto',
    'settings.profile.uploading': 'Enviando...',
    'settings.profile.remove': 'Remover',
    'settings.profile.name': 'Nome Completo',
    'settings.profile.name.placeholder': 'Seu nome completo',
    'settings.profile.bio': 'Biografia',
    'settings.profile.bio.placeholder': 'Conte um pouco sobre você...',
    'settings.profile.bio.hint': 'Esta informação será visível para seus clientes',
    'settings.profile.save': 'Salvar Alterações',
    'settings.profile.saving': 'Salvando...',
    'settings.account.title': 'Informações da Conta',
    'settings.account.email': 'Email',
    'settings.account.email.hint': 'Para alterar seu email, entre em contato com o suporte',
    'settings.account.id': 'ID da Conta',
    'settings.account.id.hint': 'Este é seu identificador único no sistema',
    'settings.account.member.since': 'Membro desde',
    'settings.language.title': 'Preferências de Idioma',
    'settings.language.subtitle': 'Escolha o idioma da interface',
    'settings.language.label': 'Idioma da Interface',
    'settings.language.hint': 'A alteração será aplicada imediatamente em toda a interface',
    'settings.success': 'Perfil atualizado',
    'settings.success.message': 'Suas informações foram salvas com sucesso!',
    'settings.error': 'Erro',
    'settings.error.message': 'Erro ao atualizar perfil',

    'common.next': 'Próximo',
    'common.previous': 'Anterior',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sim',
    'common.no': 'Não',
    'common.all': 'Todos',
    'common.none': 'Nenhum',
    'common.today': 'Hoje',
    'common.yesterday': 'Ontem',
    'common.thisWeek': 'Esta Semana',
    'common.thisMonth': 'Este Mês',
    'common.lastMonth': 'Mês Passado',
    'common.custom': 'Personalizado',

    // Form texts
    'form.title': 'Informações do Cliente',
    'form.name': 'Nome Completo',
    'form.name.placeholder': 'Digite seu nome completo',
    'form.email': 'Email',
    'form.email.placeholder': 'Digite seu email',
    'form.phone': 'Telefone',

    // Payment texts
    'payment.title': 'Método de Pagamento',
    'payment.secure': '100% Seguro',
    'payment.processing': 'Processando...',
    'payment.powered': 'Powered by',
    'payment.card.title': 'Pagamento Seguro',
    'payment.card.description': 'Processado de forma segura pelo Stripe',
    'payment.card.currency': 'Moeda',
    'payment.card.pay': 'Pagar',

    // General texts
    'button.loading': 'Carregando...',
    'button.buy': 'Finalizar Compra',
    'product.sales': 'vendas',
    'orderbump.title': 'Oferta Especial',
  },
  en: {
    // Menu/Sidebar
    'menu.dashboard': 'Dashboard',
    'menu.products': 'Products',
    'menu.sales': 'Sales',
    'menu.financial': 'Financial',
    'menu.memberAreas': 'Members',
    'menu.modulePayments': 'Module Payments',
    'menu.marketplace': 'Kamba Extra',
    'menu.affiliates': 'Affiliates',
    'menu.subscriptions': 'Subscriptions',
    'menu.refunds': 'Refunds',
    'menu.myAffiliations': 'My Affiliations',
    'menu.myPurchases': 'My Purchases',
    'menu.apps': 'Apps',
    'menu.settings': 'Settings',
    'menu.help': 'Help',
    'menu.logout': 'Logout',
    'menu.liveView': 'Live View',
    'menu.reports': 'Reports',
    'menu.balance': 'Balance',
    'menu.withdraw': 'Withdraw',
    'menu.community': 'Community',
    'menu.ranking': 'Ranking',
    'menu.collaborators': 'Collaborators',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Track your business performance',
    'dashboard.welcome': 'Welcome back',
    'dashboard.totalSales': 'Total Sales',
    'dashboard.revenue': 'Revenue',
    'dashboard.customers': 'Customers',
    'dashboard.products': 'Products',
    'dashboard.recentSales': 'Recent Sales',
    'dashboard.topProducts': 'Top Selling Products',

    // Products
    'products.title': 'Products',
    'products.new': 'New Product',
    'products.edit': 'Edit Product',
    'products.delete': 'Delete Product',
    'products.status': 'Status',
    'products.active': 'Active',
    'products.inactive': 'Inactive',
    'products.price': 'Price',
    'products.sales': 'Sales',

    // Sales
    'sales.title': 'Sales',
    'sales.subtitle': 'Manage and track your sales',
    'sales.registered': 'sales registered',
    'sales.total': 'Total',
    'sales.pending': 'Pending',
    'sales.completed': 'Completed',
    'sales.cancelled': 'Cancelled',
    'sales.refunded': 'Refunded',
    'sales.approved': 'Approved',
    'sales.paidSales': 'Paid Sales',
    'sales.pendingSales': 'Pending Sales',
    'sales.confirmed': 'confirmed sales',
    'sales.awaitingConfirmation': 'awaiting confirmation',

    // Financial
    'financial.title': 'Financial',
    'financial.balance': 'Available Balance',
    'financial.pending': 'Pending',
    'financial.withdraw': 'Request Withdrawal',
    'financial.transactions': 'Transactions',

    // Settings
    'settings.title': 'Account Settings',
    'settings.subtitle': 'Manage your personal information and settings',
    'settings.tab.profile': 'Profile',
    'settings.tab.account': 'Account',
    'settings.tab.security': 'Security',
    'settings.profile.title': 'Public Profile',
    'settings.profile.photo': 'Profile Photo',
    'settings.profile.photo.hint': 'Click on the photo to change. Max 5MB.',
    'settings.profile.upload': 'Upload Photo',
    'settings.profile.uploading': 'Uploading...',
    'settings.profile.remove': 'Remove',
    'settings.profile.name': 'Full Name',
    'settings.profile.name.placeholder': 'Your full name',
    'settings.profile.bio': 'Bio',
    'settings.profile.bio.placeholder': 'Tell us about yourself...',
    'settings.profile.bio.hint': 'This information will be visible to your customers',
    'settings.profile.save': 'Save Changes',
    'settings.profile.saving': 'Saving...',
    'settings.account.title': 'Account Information',
    'settings.account.email': 'Email',
    'settings.account.email.hint': 'To change your email, contact support',
    'settings.account.id': 'Account ID',
    'settings.account.id.hint': 'This is your unique identifier in the system',
    'settings.account.member.since': 'Member since',
    'settings.language.title': 'Language Preferences',
    'settings.language.subtitle': 'Choose the interface language',
    'settings.language.label': 'Interface Language',
    'settings.language.hint': 'Changes will be applied immediately across the interface',
    'settings.success': 'Profile updated',
    'settings.success.message': 'Your information has been saved successfully!',
    'settings.error': 'Error',
    'settings.error.message': 'Error updating profile',

    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.refresh': 'Refresh',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.none': 'None',
    'common.today': 'Today',
    'common.yesterday': 'Yesterday',
    'common.thisWeek': 'This Week',
    'common.thisMonth': 'This Month',
    'common.lastMonth': 'Last Month',
    'common.custom': 'Custom',

    // Form texts
    'form.title': 'Customer Information',
    'form.name': 'Full Name',
    'form.name.placeholder': 'Enter your full name',
    'form.email': 'Email',
    'form.email.placeholder': 'Enter your email',
    'form.phone': 'Phone',

    // Payment texts
    'payment.title': 'Payment Method',
    'payment.secure': '100% Secure',
    'payment.processing': 'Processing...',
    'payment.powered': 'Powered by',
    'payment.card.title': 'Secure Payment',
    'payment.card.description': 'Securely processed by Stripe',
    'payment.card.currency': 'Currency',
    'payment.card.pay': 'Pay',

    // General texts
    'button.loading': 'Loading...',
    'button.buy': 'Complete Purchase',
    'product.sales': 'sales',
    'orderbump.title': 'Special Offer',
  },
  es: {
    // Menu/Sidebar
    'menu.dashboard': 'Panel',
    'menu.products': 'Productos',
    'menu.sales': 'Ventas',
    'menu.financial': 'Financiero',
    'menu.memberAreas': 'Miembros',
    'menu.modulePayments': 'Pagos de Módulos',
    'menu.marketplace': 'Kamba Extra',
    'menu.affiliates': 'Afiliados',
    'menu.subscriptions': 'Suscripciones',
    'menu.refunds': 'Reembolsos',
    'menu.myAffiliations': 'Mis Afiliaciones',
    'menu.myPurchases': 'Mis Compras',
    'menu.apps': 'Apps',
    'menu.settings': 'Configuración',
    'menu.help': 'Ayuda',
    'menu.logout': 'Salir',
    'menu.liveView': 'En Vivo',
    'menu.reports': 'Informes',
    'menu.balance': 'Saldo',
    'menu.withdraw': 'Retirar',
    'menu.community': 'Comunidad',
    'menu.ranking': 'Ranking',
    'menu.collaborators': 'Colaboradores',

    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.subtitle': 'Sigue el rendimiento de tu negocio',
    'dashboard.welcome': 'Bienvenido de nuevo',
    'dashboard.totalSales': 'Total de Ventas',
    'dashboard.revenue': 'Ingresos',
    'dashboard.customers': 'Clientes',
    'dashboard.products': 'Productos',
    'dashboard.recentSales': 'Ventas Recientes',
    'dashboard.topProducts': 'Productos Más Vendidos',

    // Products
    'products.title': 'Productos',
    'products.new': 'Nuevo Producto',
    'products.edit': 'Editar Producto',
    'products.delete': 'Eliminar Producto',
    'products.status': 'Estado',
    'products.active': 'Activo',
    'products.inactive': 'Inactivo',
    'products.price': 'Precio',
    'products.sales': 'Ventas',

    // Sales
    'sales.title': 'Ventas',
    'sales.subtitle': 'Administra y sigue tus ventas',
    'sales.registered': 'ventas registradas',
    'sales.total': 'Total',
    'sales.pending': 'Pendiente',
    'sales.completed': 'Completada',
    'sales.cancelled': 'Cancelada',
    'sales.refunded': 'Reembolsada',
    'sales.approved': 'Aprobado',
    'sales.paidSales': 'Ventas Pagadas',
    'sales.pendingSales': 'Ventas Pendientes',
    'sales.confirmed': 'ventas confirmadas',
    'sales.awaitingConfirmation': 'esperando confirmación',

    // Financial
    'financial.title': 'Financiero',
    'financial.balance': 'Saldo Disponible',
    'financial.pending': 'Pendiente',
    'financial.withdraw': 'Solicitar Retiro',
    'financial.transactions': 'Transacciones',

    // Settings
    'settings.title': 'Configuración de la Cuenta',
    'settings.subtitle': 'Administra tu información personal y configuración',
    'settings.tab.profile': 'Perfil',
    'settings.tab.account': 'Cuenta',
    'settings.tab.security': 'Seguridad',
    'settings.profile.title': 'Perfil Público',
    'settings.profile.photo': 'Foto de Perfil',
    'settings.profile.photo.hint': 'Haz clic en la foto para cambiar. Máximo 5MB.',
    'settings.profile.upload': 'Subir Foto',
    'settings.profile.uploading': 'Subiendo...',
    'settings.profile.remove': 'Eliminar',
    'settings.profile.name': 'Nombre Completo',
    'settings.profile.name.placeholder': 'Tu nombre completo',
    'settings.profile.bio': 'Biografía',
    'settings.profile.bio.placeholder': 'Cuéntanos sobre ti...',
    'settings.profile.bio.hint': 'Esta información será visible para tus clientes',
    'settings.profile.save': 'Guardar Cambios',
    'settings.profile.saving': 'Guardando...',
    'settings.account.title': 'Información de la Cuenta',
    'settings.account.email': 'Email',
    'settings.account.email.hint': 'Para cambiar tu email, contacta al soporte',
    'settings.account.id': 'ID de la Cuenta',
    'settings.account.id.hint': 'Este es tu identificador único en el sistema',
    'settings.account.member.since': 'Miembro desde',
    'settings.language.title': 'Preferencias de Idioma',
    'settings.language.subtitle': 'Elige el idioma de la interfaz',
    'settings.language.label': 'Idioma de la Interfaz',
    'settings.language.hint': 'Los cambios se aplicarán inmediatamente en toda la interfaz',
    'settings.success': 'Perfil actualizado',
    'settings.success.message': '¡Tu información se ha guardado correctamente!',
    'settings.error': 'Error',
    'settings.error.message': 'Error al actualizar el perfil',

    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.refresh': 'Actualizar',
    'common.back': 'Volver',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.all': 'Todos',
    'common.none': 'Ninguno',
    'common.today': 'Hoy',
    'common.yesterday': 'Ayer',
    'common.thisWeek': 'Esta Semana',
    'common.thisMonth': 'Este Mes',
    'common.lastMonth': 'Mes Pasado',
    'common.custom': 'Personalizado',

    // Form texts
    'form.title': 'Información del Cliente',
    'form.name': 'Nombre Completo',
    'form.name.placeholder': 'Ingrese su nombre completo',
    'form.email': 'Email',
    'form.email.placeholder': 'Ingrese su email',
    'form.phone': 'Teléfono',

    // Payment texts
    'payment.title': 'Método de Pago',
    'payment.secure': '100% Seguro',
    'payment.processing': 'Procesando...',
    'payment.powered': 'Powered by',
    'payment.card.title': 'Pago Seguro',
    'payment.card.description': 'Procesado de forma segura por Stripe',
    'payment.card.currency': 'Moneda',
    'payment.card.pay': 'Pagar',

    // General texts
    'button.loading': 'Cargando...',
    'button.buy': 'Finalizar Compra',
    'product.sales': 'ventas',
    'orderbump.title': 'Oferta Especial',
  },
};

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('detectedLanguage');
    return (stored as Language) || 'pt';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('detectedLanguage', lang);
  };

  // Load language from user profile on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.language) {
          setLanguage(profile.language as Language);
        }
      }
    };
    loadUserLanguage();
  }, []);

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.pt[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    // Fallback for components outside provider
    const language = (localStorage.getItem('detectedLanguage') as Language) || 'pt';
    return {
      language,
      setLanguage: (lang: Language) => localStorage.setItem('detectedLanguage', lang),
      t: (key: string) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.pt[key] || key,
      changeLanguage: (lang: Language) => localStorage.setItem('detectedLanguage', lang),
      currentLanguage: language,
      isTranslationReady: true,
    };
  }
  return {
    ...context,
    changeLanguage: context.setLanguage,
    currentLanguage: context.language,
    isTranslationReady: true,
  };
}
