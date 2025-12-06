import React from 'react';
import { AdminHeader } from './AdminHeader';
import { cn } from '@/lib/utils';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

/**
 * Layout de página admin (Header + Main content)
 * O Sidebar é renderizado pelo AdminLayoutWrapper (persistente)
 * Este componente é usado DENTRO das rotas filhas
 */
export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const { collapsed } = useAdminSidebar();

  return (
    <div className={cn(
      "min-h-screen transition-all duration-300",
      collapsed ? "ml-20" : "ml-64"
    )}>
      <AdminHeader 
        title={title} 
        description={description}
      />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
