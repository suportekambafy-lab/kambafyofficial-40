
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSubdomain } from './useSubdomain';

export function useAuthGuard() {
  const { user, session, loading } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();

  useEffect(() => {
    if (!loading) {
      setAuthReady(true);
      
      // Não fazer verificação de auth para o domínio principal (kambafy.com)
      // A landing page é pública e não requer autenticação
      if (currentSubdomain === 'main') {
        return;
      }
      
      // Para Mobile subdomain, não fazer redirecionamentos
      if (currentSubdomain === 'mobile') {
        return;
      }
      
      // Não interferir nas rotas de área de membros - elas têm sua própria proteção
      if (window.location.pathname.includes('/members/area/') || 
          window.location.pathname.includes('/members/login/')) {
        console.log('ℹ️ useAuthGuard: Rota de área de membros detectada, ignorando');
        return;
      }
      
      // Se não há usuário ou sessão válida, redirecionar para login
      if (!user || !session) {
        console.log('🔒 useAuthGuard: Usuário não autenticado, redirecionando para /auth');
        navigate('/auth', { replace: true });
        return;
      }
      
      // Verificações adicionais de segurança
      if (!user.email || user.email.includes('usurário') || user.email.includes('usuário')) {
        console.log('🚨 useAuthGuard: Usuário com dados inválidos detectado, redirecionando');
        navigate('/auth', { replace: true });
        return;
      }
    }
  }, [loading, user, session, navigate, currentSubdomain]);

  const isAuthenticated = !loading && !!user && !!session;
  const isUnauthenticated = !loading && (!user || !session);

  return {
    user,
    session,
    loading,
    authReady,
    isAuthenticated,
    isUnauthenticated
  };
}
