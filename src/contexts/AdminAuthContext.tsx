
import React, { createContext, ReactNode } from 'react';
import { useAdminAuthHook, AdminAuthContext } from '@/hooks/useAdminAuth';

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const auth = useAdminAuthHook();

  return (
    <AdminAuthContext.Provider value={auth}>
      {children}
    </AdminAuthContext.Provider>
  );
}
