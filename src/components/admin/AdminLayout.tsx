import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { cn } from '@/lib/utils';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const { collapsed, toggleCollapsed } = useAdminSidebar();

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <AdminSidebar 
        collapsed={collapsed} 
        onToggle={toggleCollapsed} 
      />
      <AdminHeader 
        title={title} 
        description={description}
        sidebarCollapsed={collapsed}
      />
      <main className={cn(
        "p-6 transition-all duration-300",
        collapsed ? "ml-20" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
