import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLogin2FA } from '@/hooks/useLogin2FA';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import { toast } from '@/hooks/useCustomToast';
import loginHeroImage from '@/assets/about-section-team.jpg';

const Verify2FA = () => {
  const { user, requires2FA, verified2FA, pending2FAEmail, verify2FA, signOut } = useAuth();
  const { registerSuccessfulLogin } = useLogin2FA();
  const navigate = useNavigate();

  useEffect(() => {
    // Se não está logado, redirecionar para login
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Se não precisa de 2FA ou já verificou, redirecionar para o painel
    if (!requires2FA || verified2FA) {
      const userType = localStorage.getItem('userType') || 'business';
      const redirectPath = userType === 'customer' ? '/meus-acessos' : '/vendedor';
      navigate(redirectPath, { replace: true });
    }
  }, [user, requires2FA, verified2FA, navigate]);

  const handleVerificationSuccess = async () => {
    if (user) {
      // Registrar o dispositivo como confiável
      await registerSuccessfulLogin(user.id, true);
    }
    
    verify2FA();
    
    toast({
      title: "Verificação concluída!",
      description: "Seu dispositivo foi verificado com sucesso.",
    });

    const userType = localStorage.getItem('userType') || 'business';
    const redirectPath = userType === 'customer' ? '/meus-acessos' : '/vendedor';
    navigate(redirectPath, { replace: true });
  };

  const handleBack = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (!user || !requires2FA) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-geist w-full overflow-x-hidden">
      <section className="flex-1 flex items-center justify-center p-4 md:p-8 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-8 bg-card border border-border shadow-lg">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-center mb-2">
              Verificação de Segurança
            </h1>
            <p className="text-center text-muted-foreground mb-6">
              Por segurança, confirme sua identidade para continuar.
            </p>

            <TwoFactorVerification
              email={pending2FAEmail || user.email || ''}
              onVerificationSuccess={handleVerificationSuccess}
              onBack={handleBack}
              context="login"
            />
          </div>
        </div>
      </section>

      <section className="hidden md:block flex-1 relative p-4">
        <div className="absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${loginHeroImage})` }}></div>
      </section>
    </div>
  );
};

export default Verify2FA;
