import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ShoppingCart,
  Radio,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  UserCheck,
  TrendingUp,
  Users,
  Package,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';
import { Badge } from '@/components/ui/badge';

interface AdminSidebarMozProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { 
    href: '/admin/moz', 
    label: 'Painel de Controlo', 
    icon: LayoutDashboard,
    end: true
  },
  { 
    href: '/admin/moz/live', 
    label: 'Visão ao Vivo', 
    icon: Radio 
  },
  { 
    href: '/admin/moz/sales', 
    label: 'Transações', 
    icon: TrendingUp 
  },
  { 
    href: '/admin/moz/users', 
    label: 'Utilizadores', 
    icon: Users 
  },
  { 
    href: '/admin/moz/products', 
    label: 'Produtos', 
    icon: Package,
    badgeKey: 'products' as const
  },
  { 
    href: '/admin/moz/withdrawals', 
    label: 'Saques', 
    icon: CreditCard,
    badgeKey: 'withdrawals' as const
  },
  { 
    href: '/admin/moz/identity', 
    label: 'Verificação KYC', 
    icon: UserCheck,
    badgeKey: 'kyc' as const
  },
  { 
    href: '/admin/moz/refunds', 
    label: 'Reembolsos', 
    icon: RefreshCw 
  },
  { 
    href: '/admin/moz/reports', 
    label: 'Relatórios', 
    icon: Calendar 
  },
];

export function AdminSidebarMoz({ collapsed = false, onToggle }: AdminSidebarMozProps) {
  const location = useLocation();
  const { counts } = useAdminPendingCounts();
  
  const isActiveLink = (href: string, end?: boolean) => {
    if (end) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const getBadgeCount = (badgeKey?: 'kyc' | 'payments' | 'withdrawals' | 'products' | 'referrals') => {
    if (!badgeKey) return 0;
    return counts[badgeKey];
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-[hsl(var(--admin-sidebar-bg))] border-r border-[hsl(var(--admin-border))] transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo e Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[hsl(var(--admin-border))]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇲🇿</span>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-[hsl(var(--admin-text))]">Kambafy</span>
              <span className="text-xs text-[hsl(var(--admin-text-secondary))]">Moçambique</span>
            </div>
          )}
        </div>
        <button 
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[hsl(var(--admin-bg))] transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
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
            const isActive = isActiveLink(item.href, item.end);
            const badgeCount = getBadgeCount(item.badgeKey);

            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.end}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200",
                    isActive 
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))] hover:text-[hsl(var(--admin-text))]"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-emerald-600")} />
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
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Info */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className={cn(
          "rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/20",
          collapsed && "p-2"
        )}>
          {!collapsed ? (
            <>
              <p className="text-xs font-medium text-emerald-600">Admin Regional</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Moçambique 🇲🇿</p>
            </>
          ) : (
            <span className="text-lg flex justify-center">🇲🇿</span>
          )}
        </div>
      </div>
    </aside>
  );
}
