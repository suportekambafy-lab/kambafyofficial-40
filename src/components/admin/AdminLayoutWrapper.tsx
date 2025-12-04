import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

/**
 * Layout wrapper persistente para rotas admin
 * Apenas o Sidebar é compartilhado - cada página tem seu próprio Header
 * Isso evita reload completo da página ao navegar
 */
export function AdminLayoutWrapper() {
  const { collapsed, toggleCollapsed } = useAdminSidebar();

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <AdminSidebar 
        collapsed={collapsed} 
        onToggle={toggleCollapsed} 
      />
      {/* Outlet renderiza o conteúdo da rota filha (Header + Content) */}
      <Outlet />
    </div>
  );
}
