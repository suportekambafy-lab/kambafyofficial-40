import { useAuth } from '@/contexts/AuthContext';
import { AppLogin } from '@/components/app/AppLogin';
import { AppHome } from '@/components/app/AppHome';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SellerThemeProvider } from '@/hooks/useSellerTheme';

export default function AppMobile() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md p-3">
            <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
          </div>
          <LoadingSpinner text="Carregando..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <SellerThemeProvider>
      {!user ? <AppLogin /> : <AppHome />}
    </SellerThemeProvider>
  );
}
