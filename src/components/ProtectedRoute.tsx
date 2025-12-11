
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, loading, requires2FA, verified2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !session)) {
      console.log('🔒 ProtectedRoute: Redirecionando para /auth');
      navigate('/auth', { replace: true });
      return;
    }

    // Se precisa de 2FA e ainda não foi verificado, redirecionar para verificação
    if (!loading && user && session && requires2FA && !verified2FA) {
      // Não redirecionar se já está na página de verificação
      if (location.pathname !== '/verificar-2fa') {
        console.log('🔐 ProtectedRoute: 2FA necessário, redirecionando para /verificar-2fa');
        navigate('/verificar-2fa', { replace: true });
      }
    }
  }, [loading, user, session, navigate, requires2FA, verified2FA, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Verificando autenticação..." />
      </div>
    );
  }

  if (!user || !session) {
    return null;
  }

  // Se precisa de 2FA e não foi verificado, não renderizar o conteúdo
  if (requires2FA && !verified2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Verificação de segurança necessária..." />
      </div>
    );
  }

  return <>{children}</>;
}
