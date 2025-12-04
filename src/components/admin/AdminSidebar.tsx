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
  Shield,
  Settings,
  ChevronDown,
  Smartphone,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

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
  },
  {
    href: '/admin/withdrawals',
    label: 'Saques',
    icon: CreditCard,
  },
  {
    href: '/admin/identity',
    label: 'Verificação KYC',
    icon: UserCheck,
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

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-white border-r border-[hsl(var(--admin-border))] flex flex-col z-50 transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo */}
      <div className="p-5 flex items-center justify-between border-b border-[hsl(var(--admin-border))]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-[hsl(var(--admin-primary))] to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="text-white h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-[hsl(var(--admin-text))]">Kambafy</span>
          )}
        </div>
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-[hsl(var(--admin-bg))] rounded-lg transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5 text-[hsl(var(--admin-text-secondary))]" />
          ) : (
            <PanelLeftClose className="h-5 w-5 text-[hsl(var(--admin-text-secondary))]" />
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
                  <Icon className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-[hsl(var(--admin-primary))]" : ""
                  )} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
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

      {/* CTA Block */}
      {!collapsed && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-5 text-white">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Smartphone className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-sm mb-1">
              Acompanhe o seu negócio em qualquer lugar
            </h4>
            <p className="text-xs text-white/80 mb-4">
              Torne tudo mais simples
            </p>
            <button className="w-full bg-white text-[hsl(var(--admin-primary))] font-semibold text-sm py-2.5 px-4 rounded-xl hover:bg-white/90 transition-colors">
              Descarregar Aplicação
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
