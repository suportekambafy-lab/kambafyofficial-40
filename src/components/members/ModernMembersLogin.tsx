import { useState, useEffect, useId } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, BookOpen, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useDebounced } from '@/hooks/useDebounced';
import { useTheme } from '@/hooks/useTheme';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import kambafyLogo from '@/assets/kambafy-logo-gray.svg';

// Gerar um ID único para o dispositivo/navegador
const getDeviceId = (): string => {
  const storedId = localStorage.getItem('member_area_device_id');
  if (storedId) return storedId;
  
  const newId = crypto.randomUUID();
  localStorage.setItem('member_area_device_id', newId);
  return newId;
};

// Verificar se o dispositivo é confiável para um email específico
const isDeviceTrusted = (email: string): boolean => {
  const trustedDevices = localStorage.getItem('member_area_trusted_devices');
  if (!trustedDevices) return false;
  
  try {
    const devices = JSON.parse(trustedDevices);
    const deviceId = getDeviceId();
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verificar se existe um registro para este email e dispositivo
    const trusted = devices[normalizedEmail];
    if (!trusted) return false;
    
    // Verificar se o deviceId corresponde e não expirou (30 dias)
    if (trusted.deviceId === deviceId) {
      const expiresAt = new Date(trusted.expiresAt);
      if (expiresAt > new Date()) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

// Marcar dispositivo como confiável para um email
const trustDevice = (email: string): void => {
  const trustedDevices = localStorage.getItem('member_area_trusted_devices');
  let devices: Record<string, { deviceId: string; expiresAt: string }> = {};
  
  try {
    if (trustedDevices) {
      devices = JSON.parse(trustedDevices);
    }
  } catch {
    devices = {};
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de validade
  
  devices[normalizedEmail] = {
    deviceId: getDeviceId(),
    expiresAt: expiresAt.toISOString()
  };
  
  localStorage.setItem('member_area_trusted_devices', JSON.stringify(devices));
};

export default function ModernMembersLogin() {
  const { id: memberAreaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useCustomToast();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberArea, setMemberArea] = useState<any>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [is2FAForOwner, setIs2FAForOwner] = useState(false);
  const id = useId();
  
  useEffect(() => {
    console.log('🎨 ModernMembersLogin - Current theme:', theme);
    console.log('🎨 ModernMembersLogin - HTML classes:', document.documentElement.classList.toString());
    console.log('🎨 ModernMembersLogin - localStorage theme:', localStorage.getItem('kambafy-ui-theme'));
  }, [theme]);
  
  // Extrair email da URL se disponível
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
      // Normalizar email para lowercase
      setEmail(decodeURIComponent(emailFromUrl).toLowerCase().trim());
    }
  }, [location.search]);

  // Buscar email do dono da área
  useEffect(() => {
    const fetchOwnerEmail = async () => {
      if (!memberAreaId) return;
      
      const { data: memberAreaData } = await supabase
        .from('member_areas')
        .select('user_id')
        .eq('id', memberAreaId)
        .single();
      
      if (memberAreaData?.user_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', memberAreaData.user_id)
          .single();
        
        if (ownerProfile?.email) {
          setOwnerEmail(ownerProfile.email.toLowerCase().trim());
          console.log('👤 Email do dono da área:', ownerProfile.email);
        }
      }
    };
    
    fetchOwnerEmail();
  }, [memberAreaId]);
  
  // Função para completar login após 2FA (ou direto se dispositivo confiável)
  const completeLogin = (emailToUse: string, shouldTrustDevice: boolean = true) => {
    // Marcar dispositivo como confiável se necessário
    if (shouldTrustDevice) {
      trustDevice(emailToUse);
    }
    
    toast({
      title: "✅ Acesso autorizado!",
      message: "Bem-vindo à área de membros",
      variant: "success",
    });
    
    setTimeout(() => {
      console.log('🔄 Navegando para área de membros após login:', memberAreaId);
      navigate(`/area/${memberAreaId}?verified=true&email=${encodeURIComponent(emailToUse)}`);
    }, 800);
  };
  
  // Debounced function para validação e acesso
  const { debouncedFunc: debouncedAccess } = useDebounced(
    async (email: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      
      try {
        // Normalizar email para lowercase
        const normalizedEmail = email.toLowerCase().trim();
        
        // Verificar se é o email de validação especial
        if (normalizedEmail === 'validar@kambafy.com') {
          // Email de validação tem acesso a todas as áreas
          toast({
            title: "✅ Acesso de validação autorizado!",
            message: "Bem-vindo à área de membros",
            variant: "success",
          });
          
          setTimeout(() => {
            console.log('🔄 Navegando para área de membros após validação:', memberAreaId);
            navigate(`/area/${memberAreaId}?verified=true&email=${encodeURIComponent(normalizedEmail)}`);
          }, 800);
          return;
        }

        // Verificar se é o email do dono - sempre exigir 2FA
        if (ownerEmail && normalizedEmail === ownerEmail) {
          console.log('🔐 Email do dono detectado - exigindo 2FA');
          setPendingEmail(normalizedEmail);
          setIs2FAForOwner(true);
          setRequires2FA(true);
          setIsSubmitting(false);
          return;
        }
        
        // Para outros emails, verificar se tem acesso à área de membros
        const { data: studentAccess, error } = await supabase
          .from('member_area_students')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .ilike('student_email', normalizedEmail)
          .single();

        if (error || !studentAccess) {
          toast({
            title: "❌ Acesso negado",
            message: "Este email não tem acesso a esta área de membros",
            variant: "error",
          });
          return;
        }

        // Verificar se o dispositivo é confiável para este aluno
        if (isDeviceTrusted(normalizedEmail)) {
          console.log('✅ Dispositivo confiável detectado para:', normalizedEmail);
          completeLogin(normalizedEmail, false);
        } else {
          // Dispositivo novo - exigir 2FA
          console.log('🔐 Dispositivo novo detectado - exigindo 2FA para:', normalizedEmail);
          setPendingEmail(normalizedEmail);
          setIs2FAForOwner(false);
          setRequires2FA(true);
        }
        
      } catch (error: any) {
        console.error('Erro ao verificar acesso:', error);
        toast({
          title: "❌ Erro na verificação",
          message: "Erro ao verificar acesso do email",
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    1000
  );

  useEffect(() => {
    const fetchMemberArea = async () => {
      if (!memberAreaId) return;
      
      const { data } = await supabase
        .from('member_areas')
        .select('name, login_logo_url, logo_url, primary_color, accent_color, background_style')
        .eq('id', memberAreaId)
        .single();
      
      if (data) {
        setMemberArea(data);
      }
    };
    
    fetchMemberArea();
  }, [memberAreaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações rápidas
    if (!email.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        message: "Por favor, digite seu email",
        variant: "error",
      });
      return;
    }

    if (!memberAreaId) {
      toast({
        title: "❌ Erro de configuração",
        message: "ID da área de membros não encontrado",
        variant: "error",
      });
      return;
    }

    // Usar função debounced para evitar múltiplas chamadas
    debouncedAccess(email.trim());
  };

  // Mostrar tela de 2FA se necessário
  if (requires2FA && pendingEmail) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <img 
            src={kambafyLogo} 
            alt="Kambafy" 
            className="h-20 w-auto opacity-60"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-semibold tracking-tight text-white">
                  Verificação de Segurança
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  {is2FAForOwner 
                    ? "Como dono desta área, você precisa verificar sua identidade"
                    : "Detectamos um novo navegador. Por segurança, confirme sua identidade"
                  }
                </p>
              </div>
            </div>

            <TwoFactorVerification
              email={pendingEmail}
              context="member_area_login"
              onVerificationSuccess={() => {
                setRequires2FA(false);
                completeLogin(pendingEmail, true); // Marcar dispositivo como confiável
              }}
              onBack={() => {
                setRequires2FA(false);
                setPendingEmail('');
                setIs2FAForOwner(false);
              }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Logo do Kambafy */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <img 
          src={kambafyLogo} 
          alt="Kambafy" 
          className="h-20 w-auto opacity-60"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-2 mb-6">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 overflow-hidden"
              aria-hidden="true"
            >
              {memberArea?.login_logo_url || memberArea?.logo_url ? (
                <img 
                  src={memberArea.login_logo_url || memberArea.logo_url} 
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="h-6 w-6 text-zinc-300" />
              )}
            </motion.div>
            <div className="text-center">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                {memberArea?.name || 'Área de Membros'}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Digite seu email para acessar o conteúdo
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor={`${id}-email`} className="text-zinc-200">Email de Acesso</Label>
              <Input
                id={`${id}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-zinc-500"
                required
                disabled={isSubmitting}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium disabled:bg-zinc-700 disabled:text-zinc-300" 
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Processando...' : 'Acessar Área'}
              </Button>
            </motion.div>

            {/* Informação sobre portal de clientes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-6 pt-4 border-t border-zinc-800"
            >
              <p className="text-xs text-zinc-500 mb-2">
                Precisa acessar o portal de clientes?
              </p>
              <a
                href="/auth"
                className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors underline"
              >
                Clique aqui para fazer login no portal
              </a>
            </motion.div>
          </form>
        </div>
        
        {/* Footer com mensagem da Kambafy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center gap-1 text-xs text-zinc-600">
            <span>Plataforma desenvolvida por</span>
            <a 
              href="https://kambafy.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300 font-medium transition-colors"
            >
              Kambafy
            </a>
          </div>
          <p className="text-xs text-zinc-700 mt-1">
            Criação e gestão de áreas de membros profissionais
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}