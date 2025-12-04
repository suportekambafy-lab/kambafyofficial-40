import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminHeaderProps {
  title: string;
  description?: string;
  sidebarCollapsed?: boolean;
}

export function AdminHeader({ title, description, sidebarCollapsed }: AdminHeaderProps) {
  const { admin, logout } = useAdminAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={cn(
      "h-16 bg-white border-b border-[hsl(var(--admin-border))] flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300",
      sidebarCollapsed ? "ml-20" : "ml-64"
    )}>
      {/* Left side - Title */}
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">{title}</h1>
        {description && (
          <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{description}</p>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-[hsl(var(--admin-text-secondary))]">
              <Globe className="h-4 w-4" />
              <span>PT</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-[hsl(var(--admin-border))]">
            <DropdownMenuItem>🇵🇹 Português</DropdownMenuItem>
            <DropdownMenuItem>🇬🇧 English</DropdownMenuItem>
            <DropdownMenuItem>🇪🇸 Español</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-10">
              <div className="h-8 w-8 rounded-full bg-[hsl(var(--admin-primary))] flex items-center justify-center text-white text-sm font-semibold">
                {admin?.full_name ? getInitials(admin.full_name) : 'A'}
              </div>
              <span className="text-[hsl(var(--admin-text))] font-medium hidden sm:inline">
                {admin?.full_name || admin?.email?.split('@')[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-[hsl(var(--admin-text-secondary))]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border-[hsl(var(--admin-border))]">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-[hsl(var(--admin-text))]">{admin?.full_name}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">{admin?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
