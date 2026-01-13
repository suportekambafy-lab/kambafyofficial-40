import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebarMoz } from './AdminSidebarMoz';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

/**
 * Layout wrapper para rotas admin de Moçambique
 * Sidebar simplificado com apenas rotas MOZ
 */
export function AdminLayoutWrapperMoz() {
  const { collapsed, toggleCollapsed } = useAdminSidebar();

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <AdminSidebarMoz 
        collapsed={collapsed} 
        onToggle={toggleCollapsed} 
      />
      <Outlet />
    </div>
  );
}
