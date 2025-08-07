import { memo, ReactNode, useEffect, useState } from 'react';
import { SkeletonPage } from './skeleton-page';
import { useAuth } from '@/contexts/AuthContext';

interface OptimizedPageWrapperProps {
  children: ReactNode;
  skeletonVariant?: 'dashboard' | 'list' | 'form' | 'table';
  requireAuth?: boolean;
  minLoadTime?: number; // tempo mínimo para evitar flash
}

export const OptimizedPageWrapper = memo(({
  children,
  skeletonVariant = 'dashboard',
  requireAuth = true,
  minLoadTime = 300
}: OptimizedPageWrapperProps) => {
  const { user, loading: authLoading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Garantir tempo mínimo para evitar flash de loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [minLoadTime]);

  // Se requer auth e não tem usuário
  if (requireAuth && !authLoading && !user) {
    return <SkeletonPage variant={skeletonVariant} />;
  }

  // Se ainda carregando auth ou tempo mínimo não passou
  if (authLoading || !minTimeElapsed) {
    return <SkeletonPage variant={skeletonVariant} />;
  }

  return <>{children}</>;
});

OptimizedPageWrapper.displayName = 'OptimizedPageWrapper';