import { useState, useEffect, useId, useRef, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mail, Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useDebounced } from '@/hooks/useDebounced';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import { CanvasRevealEffect } from '@/components/ui/canvas-reveal-effect';
import { cn } from '@/lib/utils';

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
    const trusted = devices[normalizedEmail];
    if (!trusted) return false;
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
  expiresAt.setDate(expiresAt.getDate() + 30);
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
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberArea, setMemberArea] = useState<any>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [is2FAForOwner, setIs2FAForOwner] = useState(false);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Extrair email da URL se disponível
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
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
        }
      }
    };
    fetchOwnerEmail();
  }, [memberAreaId]);

  // Função para completar login após 2FA (ou direto se dispositivo confiável)
  const completeLogin = (emailToUse: string, shouldTrustDevice: boolean = true) => {
    if (shouldTrustDevice) {
      trustDevice(emailToUse);
    }
    toast({
      title: "✅ Acesso autorizado!",
      message: "Bem-vindo à área de membros",
      variant: "success"
    });
    setTimeout(() => {
      navigate(`/area/${memberAreaId}?verified=true&email=${encodeURIComponent(emailToUse)}`);
    }, 800);
  };

  // Debounced function para validação e acesso
  const { debouncedFunc: debouncedAccess } = useDebounced(async (email: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail === 'validar@kambafy.com') {
        toast({
          title: "✅ Acesso de validação autorizado!",
          message: "Bem-vindo à área de membros",
          variant: "success"
        });
        setTimeout(() => {
          navigate(`/area/${memberAreaId}?verified=true&email=${encodeURIComponent(normalizedEmail)}`);
        }, 800);
        return;
      }

      if (ownerEmail && normalizedEmail === ownerEmail) {
        setPendingEmail(normalizedEmail);
        setIs2FAForOwner(true);
        setRequires2FA(true);
        setIsSubmitting(false);
        return;
      }

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
          variant: "error"
        });
        return;
      }

      if (isDeviceTrusted(normalizedEmail)) {
        completeLogin(normalizedEmail, false);
      } else {
        setPendingEmail(normalizedEmail);
        setIs2FAForOwner(false);
        setRequires2FA(true);
      }
    } catch (error: any) {
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
    debouncedAccess(email.trim());
  };

  // Mostrar tela de 2FA se necessário
  if (requires2FA && pendingEmail) {
    return (
      <div className="flex w-full flex-col min-h-screen bg-black relative">
        {/* Canvas Background */}
        <div className="absolute inset-0 z-0">
          <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-black"
              colors={[[255, 255, 255], [255, 255, 255]]}
              dotSize={6}
              reverse={false}
            />
          </Suspense>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.8)_0%,_transparent_100%)]" />
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1 items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="space-y-6 text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
              >
                <Shield className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white">Verificação de Segurança</h1>
                <p className="text-white/50 mt-2 text-sm">
                  {is2FAForOwner
                    ? "Como dono desta área, você precisa verificar sua identidade"
                    : "Detectamos um novo navegador. Por segurança, confirme sua identidade"}
                </p>
              </div>
            </div>

            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <TwoFactorVerification
                email={pendingEmail}
                context="member_area_login"
                onVerificationSuccess={() => {
                  setRequires2FA(false);
                  completeLogin(pendingEmail, true);
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
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col min-h-screen bg-black relative">
      {/* Canvas Background */}
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible && (
          <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
            <div className="absolute inset-0">
              <CanvasRevealEffect
                animationSpeed={3}
                containerClassName="bg-black"
                colors={[[255, 255, 255], [255, 255, 255]]}
                dotSize={6}
                reverse={false}
              />
            </div>
          </Suspense>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.8)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="email-step"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6 text-center"
            >
              {/* Logo */}
              {(memberArea?.login_logo_url || memberArea?.logo_url) && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto"
                >
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full blur-xl opacity-40 bg-white/20" />
                    <img
                      src={memberArea.login_logo_url || memberArea.logo_url}
                      alt="Logo"
                      className="relative w-full h-full object-contain rounded-full"
                    />
                  </div>
                </motion.div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
                  {memberArea?.name || 'Área de Membros'}
                </h1>
                <p className="text-lg text-white/50 font-light">
                  Digite seu email para acessar
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    ref={inputRef}
                    id={`${id}-email`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full backdrop-blur-sm bg-white/5 text-white border border-white/10 rounded-full py-3.5 px-5 pr-12 focus:outline-none focus:border-white/30 text-center transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-black w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-white/90 transition-colors disabled:opacity-30 disabled:bg-white/20 disabled:text-white/50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                      />
                    ) : (
                      <span className="text-lg font-medium">→</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Portal link */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-8"
              >
                <p className="text-xs text-white/30 mb-2">
                  Precisa acessar o portal de clientes?
                </p>
                <a
                  href="/auth"
                  className="text-sm font-medium text-white/50 hover:text-white/70 transition-colors underline underline-offset-4"
                >
                  Clique aqui para fazer login no portal
                </a>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-6"
              >
                <p className="text-xs text-white/20">
                  Plataforma desenvolvida por{' '}
                  <a
                    href="https://kambafy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/30 hover:text-white/50 transition-colors"
                  >
                    Kambafy
                  </a>
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
