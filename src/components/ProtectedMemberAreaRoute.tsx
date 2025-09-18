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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student || !memberArea) {
    return <Navigate to={`/login/${areaId}`} replace />;
  }

  return <>{children}</>;
}