import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminSidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <AdminSidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (context === undefined) {
    return { 
      collapsed: false, 
      setCollapsed: () => {},
      toggleCollapsed: () => {}
    };
  }
  return context;
}
