import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface SidebarContextType {
  collapsed: boolean;
  isMobile: boolean;
  sidebarOpen: boolean;
  toggleCollapsed: () => void;
  toggleSidebarOpen: () => void;
  closeSidebar: () => void;
  setCollapsed: (value: boolean) => void;
  setIsMobile: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Detectar se é realmente um dispositivo móvel ou app
      const isCapacitor = Capacitor.isNativePlatform();
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Considera mobile se for Capacitor, PWA, dispositivo móvel OU tela pequena
      const mobile = isCapacitor || isStandalone || isMobileDevice || window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        setCollapsed(false);
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const toggleCollapsed = () => {
    if (!isMobile) {
      setCollapsed(!collapsed);
    }
  };

  const toggleSidebarOpen = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      isMobile, 
      sidebarOpen,
      toggleCollapsed,
      toggleSidebarOpen,
      closeSidebar,
      setCollapsed,
      setIsMobile,
      setSidebarOpen
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    // Fallback para quando não está dentro do provider
    return { 
      collapsed: false, 
      isMobile: false, 
      sidebarOpen: false,
      toggleCollapsed: () => {},
      toggleSidebarOpen: () => {},
      closeSidebar: () => {},
      setCollapsed: () => {},
      setIsMobile: () => {},
      setSidebarOpen: () => {}
    };
  }
  return context;
}
