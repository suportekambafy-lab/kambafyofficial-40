
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSubdomain } from './useSubdomain';

export function useAuthGuard() {
  const { user, session, loading } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();
  const { currentSubdomain, getSubdomainUrl } = useSubdomain();

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
      if (
        window.location.pathname.includes('/members/area/') ||
        window.location.pathname.includes('/members/login/') ||
        window.location.pathname.match(/^\/(login|area)\//)
      ) {
        console.log('ℹ️ useAuthGuard: Rota de área de membros detectada, ignorando');
        return;
      }

      // Não bloquear as próprias rotas de autenticação
      if (
        window.location.pathname.startsWith('/auth') ||
        window.location.pathname.startsWith('/verificar-2fa') ||
        window.location.pathname.startsWith('/reset-password')
      ) {
        return;
      }

      // Se não há usuário ou sessão válida, redirecionar para login (SEMPRE no app subdomain)
      if (!user || !session) {
        const authPath = '/auth?mode=login';

        console.log('🔒 useAuthGuard: Usuário não autenticado, redirecionando para login', {
          currentSubdomain,
          authPath
        });

        if (currentSubdomain === 'app') {
          navigate(authPath, { replace: true });
        } else {
          window.location.href = getSubdomainUrl('app', authPath);
        }
        return;
      }
      
      // Removido: Verificações agressivas de email que causavam logout indevido
      // O AuthContext já valida a sessão de forma adequada
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
