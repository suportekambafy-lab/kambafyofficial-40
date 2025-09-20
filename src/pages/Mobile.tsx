
import React, { useState, useEffect } from 'react';
import { SignInPage } from '@/components/ui/sign-in-flow-1';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import MinhasCompras from '@/pages/MinhasCompras';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';

const Mobile = () => {
  const [userType, setUserType] = useState<'customer' | 'seller' | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'customer' | 'seller' | null>(null);
  const { user, loading, signIn } = useAuth();
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

  const handleUserTypeSelect = (type: 'customer' | 'seller' | null) => {
    setSelectedUserType(type);
    if (type) {
      localStorage.setItem('userType', type);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!selectedUserType) {
      return;
    }
    
    try {
      localStorage.setItem('userType', selectedUserType);
      localStorage.setItem('googleAuthMode', 'signin');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/mobile`,
        },
      });

      if (error) {
        console.error('Erro no login com Google:', error);
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    if (!selectedUserType) {
      throw new Error('Tipo de usuário não selecionado');
    }

    localStorage.setItem('userType', selectedUserType);
    const result = await signIn(email, password);
    
    if (result.error) {
      throw result.error;
    }
  };

  // Loading enquanto verifica autenticação
  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-checkout-green">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-checkout-green font-bold text-2xl">K</span>
          </div>
          <LoadingSpinner text="Carregando..." size="lg" />
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostra o novo componente de login
  if (!isAuthenticated) {
    return (
      <SignInPage
        selectedUserType={selectedUserType}
        onUserTypeSelect={handleUserTypeSelect}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
      />
    );
  }

  // Se está autenticado, mostra a interface baseada no tipo de usuário
  if (userType === 'seller') {
    return <MobileDashboard />;
  } else if (userType === 'customer') {
    return <MinhasCompras />;
  }

  // Fallback
  return (
    <SignInPage
      selectedUserType={selectedUserType}
      onUserTypeSelect={handleUserTypeSelect}
      onSignIn={handleSignIn}
      onGoogleSignIn={handleGoogleSignIn}
    />
  );
};

export default Mobile;
