import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  LogOut,
  FileText,
  Shield,
  Globe,
  Settings,
  Eye,
  TrendingUp,
  UserCheck,
  Calendar,
  Store,
  RefreshCw
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats?: {
    total_users: number;
    total_products: number;
    total_transactions: number;
    pending_withdrawals: number;
    total_paid_out: number;
  };
  usersByCountry?: Array<{
    country: string;
    count: number;
    flag: string;
  }>;
  selectedCountry?: string;
  onCountrySelect?: (country: string) => void;
}

const menuItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Visão geral do sistema'
  },
  {
    href: '/admin/sales',
    label: 'Vendas',
    icon: TrendingUp,
    description: 'Todas as transações',
    badge: 'transactions'
  },
  {
    href: '/admin/marketplace',
    label: 'Marketplace',
    icon: Store,
    description: 'Controlar produtos visíveis'
  },
  {
    href: '/admin/users',
    label: 'Usuários',
    icon: Users,
    description: 'Gerenciar contas de usuários',
    badge: 'users'
  },
  {
    href: '/admin/products',
    label: 'Produtos',
    icon: Package,
    description: 'Moderar produtos',
    badge: 'products'
  },
  {
    href: '/admin/withdrawals',
    label: 'Saques',
    icon: CreditCard,
    description: 'Aprovar solicitações',
    badge: 'withdrawals'
  },
  {
    href: '/admin/refunds',
    label: 'Reembolsos',
    icon: RefreshCw,
    description: 'Disputas e intervenções'
  },
  {
    href: '/admin/identity',
    label: 'Verificação KYC',
    icon: UserCheck,
    description: 'Verificar identidades'
  },
  {
    href: '/admin/seller-reports',
    label: 'Relatórios',
    icon: Calendar,
    description: 'Análises de vendedores'
  },
  {
    href: '/admin/payment-approvals',
    label: 'Aprovar Pagamentos',
    icon: CreditCard,
    description: 'Transferências pendentes',
    badge: 'pending_transfers'
  },
  {
    href: '/admin/management',
    label: 'Gerenciar Admins',
    icon: Shield,
    description: 'Administrar equipe'
  }
];

export default function AdminDrawer({ 
  open, 
  onOpenChange, 
  stats, 
  usersByCountry = [],
  selectedCountry = 'todos',
  onCountrySelect 
}: AdminDrawerProps) {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
  };

  const getBadgeValue = (badgeType: string) => {
    if (!stats) return undefined;
    
    switch (badgeType) {
      case 'users':
        return stats.total_users > 0 ? stats.total_users.toString() : undefined;
      case 'products':
        return stats.total_products > 0 ? stats.total_products.toString() : undefined;
      case 'withdrawals':
        return stats.pending_withdrawals > 0 ? stats.pending_withdrawals.toString() : undefined;
      case 'transactions':
        return stats.total_transactions > 0 ? stats.total_transactions.toString() : undefined;
      case 'pending_transfers':
        // Esta será calculada dinamicamente na página
        return undefined;
      default:
        return undefined;
    }
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}
      
      {/* Slide-in Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-slate-800 text-white transform transition-transform duration-300 ease-in-out z-50 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Shield className="text-white h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Painel Admin</h2>
                <p className="text-slate-300 text-sm">
                  {admin?.full_name || admin?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Countries Filter Section */}
            {usersByCountry.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-slate-400" />
                  <h3 className="font-semibold">Filtrar por País</h3>
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant={selectedCountry === 'todos' ? 'default' : 'ghost'}
                    className="w-full justify-between text-white hover:bg-slate-700"
                    onClick={() => onCountrySelect?.('todos')}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🌍</span>
                      <span>Todos os países</span>
                    </div>
                    <Badge variant="secondary">
                      {usersByCountry.reduce((sum, country) => sum + country.count, 0)}
                    </Badge>
                  </Button>

                  {usersByCountry.map((country) => (
                    <Button
                      key={country.country}
                      variant={selectedCountry === country.country ? 'default' : 'ghost'}
                      className="w-full justify-between text-white hover:bg-slate-700"
                      onClick={() => onCountrySelect?.(country.country)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{country.flag}</span>
                        <span>{country.country}</span>
                      </div>
                      <Badge variant="secondary">{country.count}</Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-slate-400" />
                <h3 className="font-semibold">Funções</h3>
              </div>

              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const badgeValue = item.badge ? getBadgeValue(item.badge) : undefined;
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => onOpenChange(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors w-full ${
                        isActive 
                          ? "bg-blue-600 text-white" 
                          : "text-slate-300 hover:bg-slate-700 hover:text-white"
                      }`
                    }
                  >
                    <div className="p-2 rounded-lg bg-white/10">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        {badgeValue && (
                          <Badge 
                            variant={item.badge === 'withdrawals' ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {badgeValue}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </NavLink>
                );
              })}
            </div>

            {/* Admin Stats */}
            {stats && (
              <div className="mt-8 p-4 bg-slate-700 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Estatísticas
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-slate-600 rounded">
                    <div className="font-bold text-lg">{stats.total_users}</div>
                    <div className="text-slate-300">Usuários</div>
                  </div>
                  <div className="text-center p-2 bg-slate-600 rounded">
                    <div className="font-bold text-lg">{stats.total_products}</div>
                    <div className="text-slate-300">Produtos</div>
                  </div>
                  <div className="text-center p-2 bg-slate-600 rounded">
                    <div className="font-bold text-lg">{stats.total_transactions}</div>
                    <div className="text-slate-300">Transações</div>
                  </div>
                  <div className="text-center p-2 bg-slate-600 rounded">
                    <div className="font-bold text-lg text-orange-400">{stats.pending_withdrawals}</div>
                    <div className="text-slate-300">Saques</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Logout */}
          <div className="border-t border-slate-700 p-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair do Admin
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}