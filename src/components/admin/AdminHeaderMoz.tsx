import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, ChevronDown, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AdminHeaderMozProps {
  title: string;
  description?: string;
}

export function AdminHeaderMoz({ title, description }: AdminHeaderMozProps) {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'A';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-[hsl(var(--admin-bg))]/95 backdrop-blur-sm border-b border-[hsl(var(--admin-border))]">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="gap-2 text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text))]"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin Principal
          </Button>
          <div className="h-6 w-px bg-[hsl(var(--admin-border))]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🇲🇿</span>
              <h1 className="text-lg font-semibold text-[hsl(var(--admin-text))]">{title}</h1>
            </div>
            {description && (
              <p className="text-sm text-[hsl(var(--admin-text-secondary))]">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs font-medium text-emerald-600">Moçambique</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-[hsl(var(--admin-bg))]"
              >
                <Avatar className="h-8 w-8 bg-emerald-500/10">
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                    {getInitials(admin?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-[hsl(var(--admin-text))]">
                    {admin?.full_name || admin?.email || 'Admin'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Admin Principal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Terminar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
