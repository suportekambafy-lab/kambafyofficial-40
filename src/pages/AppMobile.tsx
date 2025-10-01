import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogin } from '@/components/app/AppLogin';
import { AppHome } from '@/components/app/AppHome';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AppMobile() {
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-primary/80">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl p-4">
            <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
          </div>
          <LoadingSpinner text="Carregando..." size="lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AppLogin />;
  }

  return <AppHome />;
}
