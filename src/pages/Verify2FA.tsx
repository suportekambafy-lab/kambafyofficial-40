import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLogin2FA } from '@/hooks/useLogin2FA';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import { toast } from '@/hooks/useCustomToast';
import loginHeroImage from '@/assets/about-section-team.jpg';
import KambafyLogo from '@/assets/kambafy-logo-gray.svg';
import { motion } from 'framer-motion';

const Verify2FA = () => {
  const { user, requires2FA, verified2FA, pending2FAEmail, verify2FA, signOut } = useAuth();
  const { registerSuccessfulLogin, deviceInfo } = useLogin2FA();
  const navigate = useNavigate();
  
  // Determinar tipo de usuário para mensagens personalizadas
  const userType = localStorage.getItem('userType') || 'business';
  const isCustomer = userType === 'customer';

  useEffect(() => {
    // Se não está logado, redirecionar para login
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Se não precisa de 2FA ou já verificou, redirecionar para o painel
    if (!requires2FA || verified2FA) {
      const redirectPath = isCustomer ? '/meus-acessos' : '/vendedor';
      navigate(redirectPath, { replace: true });
    }
  }, [user, requires2FA, verified2FA, navigate, isCustomer]);

  const handleVerificationSuccess = async () => {
    if (user) {
      console.log('🔐 2FA verificado, registrando dispositivo como confiável...');
      console.log('📱 DeviceInfo disponível:', !!deviceInfo);
      
      // Aguardar um pouco se deviceInfo ainda não carregou
      if (!deviceInfo) {
        console.log('⏳ Aguardando deviceInfo carregar...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Registrar o dispositivo como confiável (90 dias)
      await registerSuccessfulLogin(user.id, true);
      console.log('✅ Dispositivo registrado como confiável');
    }
    
    verify2FA();
    
    toast({
      title: "Verificação concluída!",
      description: "Seu dispositivo foi verificado com sucesso. Não pediremos 2FA neste dispositivo por 90 dias.",
    });

    const redirectPath = isCustomer ? '/meus-acessos' : '/vendedor';
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
    <div className="min-h-screen flex flex-col md:flex-row font-geist w-full overflow-x-hidden bg-background">
      <section className="flex-1 flex items-center justify-center p-4 md:p-8 py-8">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="rounded-3xl p-8 bg-card border border-border shadow-xl">
            {/* Logo Kambafy */}
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="w-20 h-20 bg-foreground rounded-2xl flex items-center justify-center p-3 shadow-lg">
                <img 
                  src={KambafyLogo} 
                  alt="Kambafy" 
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <h1 className="text-2xl font-semibold text-center mb-2 text-foreground">
                Verificação de Segurança
              </h1>
              <p className="text-center text-muted-foreground mb-2">
                {isCustomer 
                  ? 'Confirme sua identidade para acessar seus cursos.'
                  : 'Confirme sua identidade para acessar seu painel de vendedor.'
                }
              </p>
              <p className="text-center text-sm text-muted-foreground/70 mb-6">
                Detectamos um novo dispositivo ou navegador.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <TwoFactorVerification
                email={pending2FAEmail || user.email || ''}
                onVerificationSuccess={handleVerificationSuccess}
                onBack={handleBack}
                context="login"
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="hidden md:block flex-1 relative p-4">
        <motion.div 
          className="absolute inset-4 rounded-3xl bg-cover bg-center shadow-2xl" 
          style={{ backgroundImage: `url(${loginHeroImage})` }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
      </section>
    </div>
  );
};

export default Verify2FA;
