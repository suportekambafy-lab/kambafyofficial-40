import { useState, useEffect, useId } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, BookOpen, Shield, Sparkles } from 'lucide-react';
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
  let devices: Record<string, {
    deviceId: string;
    expiresAt: string;
  }> = {};
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

// Converter hex para HSL
const hexToHsl = (hex: string): {
  h: number;
  s: number;
  l: number;
} | null => {
  if (!hex || !hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};
export default function ModernMembersLogin() {
  const {
    id: memberAreaId
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useCustomToast();
  const {
    theme
  } = useTheme();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberArea, setMemberArea] = useState<any>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [is2FAForOwner, setIs2FAForOwner] = useState(false);
  const id = useId();

  // Cores dinâmicas baseadas na área de membros
  const primaryColor = memberArea?.primary_color || '#10b981';
  const accentColor = memberArea?.accent_color || '#6366f1';
  const primaryHsl = hexToHsl(primaryColor);
  const accentHsl = hexToHsl(accentColor);
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
      const {
        data: memberAreaData
      } = await supabase.from('member_areas').select('user_id').eq('id', memberAreaId).single();
      if (memberAreaData?.user_id) {
        const {
          data: ownerProfile
        } = await supabase.from('profiles').select('email').eq('user_id', memberAreaData.user_id).single();
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
      variant: "success"
    });
    setTimeout(() => {
      console.log('🔄 Navegando para área de membros após login:', memberAreaId);
      navigate(`/area/${memberAreaId}?verified=true&email=${encodeURIComponent(emailToUse)}`);
    }, 800);
  };

  // Debounced function para validação e acesso
  const {
    debouncedFunc: debouncedAccess
  } = useDebounced(async (email: string) => {
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
          variant: "success"
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
      const {
        data: studentAccess,
        error
      } = await supabase.from('member_area_students').select('*').eq('member_area_id', memberAreaId).ilike('student_email', normalizedEmail).single();
      if (error || !studentAccess) {
        toast({
          title: "❌ Acesso negado",
          message: "Este email não tem acesso a esta área de membros",
          variant: "error"
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
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, 1000);
  useEffect(() => {
    const fetchMemberArea = async () => {
      if (!memberAreaId) return;
      const {
        data
      } = await supabase.from('member_areas').select('name, login_logo_url, logo_url, primary_color, accent_color, background_style').eq('id', memberAreaId).single();
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
        variant: "error"
      });
      return;
    }
    if (!memberAreaId) {
      toast({
        title: "❌ Erro de configuração",
        message: "ID da área de membros não encontrado",
        variant: "error"
      });
      return;
    }

    // Usar função debounced para evitar múltiplas chamadas
    debouncedAccess(email.trim());
  };

  // Estilo dinâmico do gradiente baseado nas cores da área
  const gradientStyle = {
    background: `radial-gradient(ellipse at top left, ${primaryColor}15 0%, transparent 50%), 
                 radial-gradient(ellipse at bottom right, ${accentColor}15 0%, transparent 50%),
                 radial-gradient(ellipse at center, ${primaryColor}08 0%, transparent 70%)`
  };

  // Mostrar tela de 2FA se necessário
  if (requires2FA && pendingEmail) {
    return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background com gradiente dinâmico */}
        <div className="absolute inset-0" style={gradientStyle} />
        
        {/* Orbes animados */}
        <motion.div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl opacity-20" style={{
        backgroundColor: primaryColor
      }} animate={{
        scale: [1, 1.2, 1],
        opacity: [0.2, 0.3, 0.2]
      }} transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }} />
        <motion.div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-15" style={{
        backgroundColor: accentColor
      }} animate={{
        scale: [1.2, 1, 1.2],
        opacity: [0.15, 0.25, 0.15]
      }} transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }} />

        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }} className="mb-8 relative z-10">
          <img src={kambafyLogo} alt="Kambafy" className="h-16 w-auto opacity-50" />
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 20,
        scale: 0.95
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} transition={{
        duration: 0.5,
        delay: 0.2
      }} className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl border rounded-2xl p-8 shadow-2xl" style={{
          backgroundColor: 'rgba(24, 24, 27, 0.8)',
          borderColor: `${primaryColor}30`,
          boxShadow: `0 25px 50px -12px ${primaryColor}20`
        }}>
            <div className="flex flex-col items-center gap-3 mb-8">
              <motion.div initial={{
              scale: 0
            }} animate={{
              scale: 1
            }} transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 200
            }} className="flex size-14 shrink-0 items-center justify-center rounded-full" style={{
              background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)`,
              border: `1px solid ${primaryColor}50`
            }}>
                <Shield className="h-7 w-7" style={{
                color: primaryColor
              }} />
              </motion.div>
              <div className="text-center">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Verificação de Segurança
                </h1>
                <p className="text-sm text-zinc-400 mt-2 max-w-xs">
                  {is2FAForOwner ? "Como dono desta área, você precisa verificar sua identidade" : "Detectamos um novo navegador. Por segurança, confirme sua identidade"}
                </p>
              </div>
            </div>

            <TwoFactorVerification email={pendingEmail} context="member_area_login" onVerificationSuccess={() => {
            setRequires2FA(false);
            completeLogin(pendingEmail, true);
          }} onBack={() => {
            setRequires2FA(false);
            setPendingEmail('');
            setIs2FAForOwner(false);
          }} />
          </div>
        </motion.div>
      </div>;
  }
  return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background com gradiente dinâmico */}
      <div className="absolute inset-0" style={gradientStyle} />
      
      {/* Grid pattern sutil */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
      backgroundImage: `linear-gradient(${primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${primaryColor} 1px, transparent 1px)`,
      backgroundSize: '50px 50px'
    }} />
      
      {/* Orbes animados */}
      <motion.div className="absolute top-10 left-10 w-64 h-64 rounded-full blur-3xl" style={{
      backgroundColor: primaryColor,
      opacity: 0.15
    }} animate={{
      x: [0, 30, 0],
      y: [0, -20, 0],
      scale: [1, 1.1, 1]
    }} transition={{
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut"
    }} />
      <motion.div className="absolute bottom-10 right-10 w-80 h-80 rounded-full blur-3xl" style={{
      backgroundColor: accentColor,
      opacity: 0.12
    }} animate={{
      x: [0, -30, 0],
      y: [0, 20, 0],
      scale: [1.1, 1, 1.1]
    }} transition={{
      duration: 15,
      repeat: Infinity,
      ease: "easeInOut"
    }} />
      <motion.div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full blur-3xl" style={{
      backgroundColor: primaryColor,
      opacity: 0.08
    }} animate={{
      scale: [1, 1.3, 1],
      opacity: [0.08, 0.12, 0.08]
    }} transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }} />

      {/* Logo do Kambafy */}
      <motion.div initial={{
      opacity: 0,
      y: -30
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      ease: "easeOut"
    }} className="mb-10 relative z-10">
        <img src={kambafyLogo} alt="Kambafy" className="h-14 w-auto opacity-40 hover:opacity-60 transition-opacity duration-300" />
      </motion.div>

      <motion.div initial={{
      opacity: 0,
      y: 30,
      scale: 0.95
    }} animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }} transition={{
      duration: 0.6,
      delay: 0.15,
      ease: "easeOut"
    }} className="w-full max-w-sm relative z-10">
        {/* Card com glassmorphism */}
        <div className="backdrop-blur-xl border rounded-2xl p-8 shadow-2xl relative overflow-hidden" style={{
        backgroundColor: 'rgba(24, 24, 27, 0.75)',
        borderColor: `${primaryColor}25`,
        boxShadow: `0 25px 50px -12px ${primaryColor}15, 0 0 0 1px ${primaryColor}10`
      }}>
          {/* Brilho sutil no topo do card */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: `linear-gradient(90deg, transparent, ${primaryColor}50, transparent)`
        }} />
          
          <div className="flex flex-col items-center gap-3 mb-8">
            <motion.div initial={{
            scale: 0,
            rotate: -180
          }} animate={{
            scale: 1,
            rotate: 0
          }} transition={{
            delay: 0.3,
            type: "spring",
            stiffness: 200,
            damping: 15
          }} className="relative">
              {/* Glow atrás do logo */}
              <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{
              backgroundColor: primaryColor
            }} />
              <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full overflow-hidden" style={{
              background: memberArea?.login_logo_url || memberArea?.logo_url ? 'transparent' : `linear-gradient(135deg, ${primaryColor}40, ${accentColor}40)`,
              border: `2px solid ${primaryColor}40`,
              boxShadow: `0 0 20px ${primaryColor}30`
            }}>
                {memberArea?.login_logo_url || memberArea?.logo_url ? <img src={memberArea.login_logo_url || memberArea.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <BookOpen className="h-7 w-7" style={{
                color: primaryColor
              }} />}
              </div>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.4
          }} className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {memberArea?.name || 'Área de Membros'}
              </h1>
              <p className="text-sm text-zinc-400 mt-2">
                Digite seu email para acessar o conteúdo exclusivo
              </p>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: 0.45
          }} className="space-y-2">
              <Label htmlFor={`${id}-email`} className="text-zinc-300 text-sm font-medium">
                Email de Acesso
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-1 h-12 rounded-xl transition-all duration-200" style={{
                '--tw-ring-color': `${primaryColor}50`
              } as React.CSSProperties} required disabled={isSubmitting} />
              </div>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.5
          }}>
              <Button type="submit" className="w-full h-12 font-semibold text-base rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              color: 'white',
              boxShadow: `0 10px 30px -10px ${primaryColor}60`
            }} disabled={isSubmitting || !email}>
                {isSubmitting ? <motion.div animate={{
                rotate: 360
              }} transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                {isSubmitting ? 'Verificando...' : 'Acessar Conteúdo'}
              </Button>
            </motion.div>

            {/* Informação sobre portal de clientes */}
            <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.55
          }} className="text-center mt-8 pt-6 border-t border-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-2">
                Precisa acessar o portal de clientes?
              </p>
              <a href="/auth" className="text-sm font-medium transition-colors duration-200 hover:underline" style={{
              color: primaryColor
            }}>
                Clique aqui para fazer login no portal
              </a>
            </motion.div>
          </form>
        </div>
        
        {/* Footer com mensagem da Kambafy */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.65
      }} className="mt-10 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <span>Plataforma desenvolvida por</span>
            <a href="https://kambafy.com" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors duration-200" style={{
            color: primaryColor
          }}>
              Kambafy
            </a>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Criação e gestão de áreas de membros profissionais
          </p>
        </motion.div>
      </motion.div>
    </div>;
}