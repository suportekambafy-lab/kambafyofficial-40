import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <AdminHeader 
        title={title} 
        description={description}
        sidebarCollapsed={sidebarCollapsed}
      />
      <main className={cn(
        "p-6 transition-all duration-300",
        sidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
