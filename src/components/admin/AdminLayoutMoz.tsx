import React from 'react';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { AdminHeaderMoz } from './AdminHeaderMoz';
import { cn } from '@/lib/utils';

interface AdminLayoutMozProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AdminLayoutMoz({ children, title, description }: AdminLayoutMozProps) {
  const { collapsed } = useAdminSidebar();

  return (
    <main className={cn(
      "min-h-screen transition-all duration-300",
      collapsed ? "pl-20" : "pl-64"
    )}>
      <AdminHeaderMoz title={title} description={description} />
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}
