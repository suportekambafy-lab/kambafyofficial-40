
import React, { useState, useEffect } from 'react';
import { MobileLoginChoice } from '@/components/mobile/MobileLoginChoice';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import Auth from './Auth';
import MeusAcessos from './MeusAcessos';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Mobile = () => {
  const [userType, setUserType] = useState<'customer' | 'seller' | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { user, loading } = useAuth();
  const { authReady, isAuthenticated } = useAuthGuard();

  useEffect(() => {
    if (isAuthenticated && user) {
      const storedUserType = localStorage.getItem('userType') as 'customer' | 'business' | null;
      if (storedUserType === 'business') {
        setUserType('seller');
      } else if (storedUserType === 'customer') {
        setUserType('customer');
      }
    }
  }, [isAuthenticated, user]);

  // Loading enquanto verifica autenticação
  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-checkout-green">
         <div className="text-center">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-3">
             <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
           </div>
          <LoadingSpinner text="Carregando..." size="lg" />
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostra escolha de tipo de usuário
  if (!isAuthenticated) {
    if (!userType) {
      return (
        <MobileLoginChoice 
          onChoice={(type) => {
            setUserType(type);
            setShowAuth(true);
          }} 
        />
      );
    }

    if (showAuth) {
      return <Auth />;
    }
  }

  // Se está autenticado, mostra a interface baseada no tipo de usuário
  // SEMPRE usar as interfaces mobile quando estiver no mobile
  if (userType === 'seller') {
    return <MobileDashboard />;
  } else if (userType === 'customer') {
    return <MeusAcessos />;
  }

  // Fallback
  return (
    <MobileLoginChoice 
      onChoice={(type) => {
        setUserType(type);
        setShowAuth(true);
      }} 
    />
  );
};

export default Mobile;
