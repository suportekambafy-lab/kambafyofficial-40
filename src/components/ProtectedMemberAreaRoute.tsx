import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedMemberAreaRouteProps {
  children: ReactNode;
}

export default function ProtectedMemberAreaRoute({ children }: ProtectedMemberAreaRouteProps) {
  const { student, memberArea, loading } = useMemberAreaAuth();
  const { id: areaId } = useParams();

  console.log('🛡️ ProtectedMemberAreaRoute: Estado atual', {
    areaId,
    loading,
    hasStudent: !!student,
    hasMemberArea: !!memberArea,
    memberAreaId: memberArea?.id,
    currentUrl: window.location.href,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    console.log('⏳ ProtectedMemberAreaRoute: Ainda carregando...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student || !memberArea) {
    console.log('🚫 ProtectedMemberAreaRoute: Não autenticado, redirecionando para login', {
      hasStudent: !!student,
      hasMemberArea: !!memberArea,
      redirectTo: `/login/${areaId}`
    });
    return <Navigate to={`/login/${areaId}`} replace />;
  }

  console.log('✅ ProtectedMemberAreaRoute: Acesso autorizado, renderizando children');
  return <>{children}</>;
}