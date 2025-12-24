import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Store,
  Users,
  Package,
  CreditCard,
  UserCheck,
  Calendar,
  Settings,
  ChevronDown,
  Shield,
  PanelLeftClose,
  PanelLeft,
  Wrench,
  Radio,
  RefreshCw,
  Sparkles,
  GraduationCap,
  BarChart3
} from 'lucide-react';
import kambabyLogo from '@/assets/kambafy-logo.png';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';
import { Badge } from '@/components/ui/badge';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  {
    href: '/admin',
    label: 'Painel de Controlo',
    icon: LayoutDashboard,
    end: true
  },
  {
    href: '/admin/live',
    label: 'Visão ao Vivo',
    icon: Radio,
  },
  {
    href: '/admin/sales',
    label: 'Transações',
    icon: TrendingUp,
  },
  {
    href: '/admin/marketplace',
    label: 'Marketplace',
    icon: Store,
  },
  {
    href: '/admin/users',
    label: 'Utilizadores',
    icon: Users,
  },
  {
    href: '/admin/products',
    label: 'Produtos',
    icon: Package,
    badgeKey: 'products' as const
  },
  {
    href: '/admin/member-areas',
    label: 'Áreas de Membros',
    icon: GraduationCap,
  },
  {
    href: '/admin/withdrawals',
    label: 'Saques',
    icon: CreditCard,
    badgeKey: 'withdrawals' as const
  },
  {
    href: '/admin/identity',
    label: 'Verificação KYC',
    icon: UserCheck,
    badgeKey: 'kyc' as const
  },
  {
    href: '/admin/seller-reports',
    label: 'Relatórios',
    icon: Calendar,
  },
  {
    href: '/admin/payment-approvals',
    label: 'Aprovar Pagamentos',
    icon: CreditCard,
    badgeKey: 'payments' as const
  },
  {
    href: '/admin/refunds',
    label: 'Reembolsos',
    icon: RefreshCw,
  },
  {
    href: '/admin/apps',
    label: 'Apps',
    icon: Sparkles,
  },
  {
    href: '/admin/extras',
    label: 'Extras',
    icon: Wrench,
  },
  {
    href: '/admin/stats',
    label: 'Estatísticas Admins',
    icon: BarChart3,
  },
  {
    href: '/admin/management',
    label: 'Configurações',
    icon: Settings,
    hasSubmenu: true
  }
];

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const { counts } = useAdminPendingCounts();

  const getBadgeCount = (badgeKey?: 'kyc' | 'payments' | 'withdrawals' | 'products') => {
    if (!badgeKey) return 0;
    return counts[badgeKey];
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-white border-r border-[hsl(var(--admin-border))] flex flex-col z-50 transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-[70px] flex items-center justify-between px-4 border-b border-[hsl(var(--admin-border))]">
        <div className="relative flex items-center justify-center overflow-hidden">
          <img 
            src={kambabyLogo} 
            alt="Kambafy" 
            className={`h-[60px] w-auto transition-all duration-300 ${collapsed ? 'opacity-0 scale-75 absolute' : 'opacity-100 scale-100'}`}
          />
          <img 
            src="/kambafy-icon-light.png" 
            alt="Kambafy" 
            className={`w-10 h-10 object-contain transition-all duration-300 ${collapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute'}`}
          />
        </div>
        <button 
          onClick={onToggle}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-[hsl(var(--admin-bg))] rounded-lg transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
          )}
        </button>
      </div>

      {/* Menu Label */}
      {!collapsed && (
        <div className="px-5 py-4">
          <span className="text-xs font-semibold text-[hsl(var(--admin-text-secondary))] uppercase tracking-wider">
            Menu
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end 
              ? location.pathname === item.href 
              : location.pathname.startsWith(item.href);
            const badgeCount = getBadgeCount(item.badgeKey);

            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.end}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-[hsl(var(--admin-active-bg))] text-[hsl(var(--admin-primary))]"
                      : "text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))] hover:text-[hsl(var(--admin-text))]"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-[hsl(var(--admin-primary))]" : ""
                    )} />
                    {collapsed && badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 min-w-[20px] px-1.5 text-[11px] font-bold"
                        >
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </Badge>
                      )}
                      {item.hasSubmenu && (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Info Block - Compact */}
      {!collapsed && (
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium">Painel Administrativo</span>
          </div>
        </div>
      )}
    </aside>
  );
}
