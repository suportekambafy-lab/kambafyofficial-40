import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ShoppingCart,
  Radio,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AdminSidebarMozProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { 
    href: '/admin/moz', 
    label: 'Painel de Controlo', 
    icon: LayoutDashboard 
  },
  { 
    href: '/admin/moz/sales', 
    label: 'Transações', 
    icon: ShoppingCart 
  },
  { 
    href: '/admin/moz/live', 
    label: 'Visão ao Vivo', 
    icon: Radio 
  },
];

export function AdminSidebarMoz({ collapsed = false, onToggle }: AdminSidebarMozProps) {
  const location = useLocation();
  
  const isActiveLink = (href: string) => {
    if (href === '/admin/moz') {
      return location.pathname === '/admin/moz';
    }
    return location.pathname.startsWith(href);
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

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.href);

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-600 font-medium"
                  : "text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))] hover:text-[hsl(var(--admin-text))]"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-emerald-600")} />
              {!collapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </NavLink>
          );
        })}
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
