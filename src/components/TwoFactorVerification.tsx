import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface TwoFactorVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
  context?: 'login' | 'bank_details_change' | 'withdrawal' | 'password_change' | 'disable_2fa' | 'member_area_login';
  skipInitialSend?: boolean;
}

// Check icon component
const CheckIcon = ({ size = 16, strokeWidth = 3, ...props }: { size?: number; strokeWidth?: number; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Success animation component
const OTPSuccess = () => {
  return (
    <div className="flex items-center justify-center gap-4 w-full py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 30 }}
        className="w-16 h-16 bg-green-500 ring-4 ring-green-500/20 text-white flex items-center justify-center rounded-full"
      >
        <CheckIcon size={32} strokeWidth={3} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-green-500 font-semibold text-lg"
      >
        Código Verificado!
      </motion.p>
    </div>
  );
};

// Error message component
const OTPError = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="text-center text-red-500 font-medium mt-2 absolute -bottom-8 w-full text-sm"
    >
      Código inválido. Tente novamente.
    </motion.div>
  );
};

// Single OTP input box component with animations
const OTPInputBox = ({ 
  index, 
  value, 
  onChange, 
  onKeyDown, 
  onPaste,
  state, 
  disabled,
  totalInputs = 6
}: { 
  index: number; 
  value: string;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  state: 'idle' | 'error' | 'success' | 'loading';
  disabled: boolean;
  totalInputs?: number;
}) => {
  const animationControls = useAnimationControls();
  useEffect(() => {
    animationControls.start({
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 700, damping: 20, delay: index * 0.05 },
    });
    return () => animationControls.stop();
  }, []);

  const handleFocus = () => {
    animationControls.start({ y: -5, transition: { type: "spring" as const, stiffness: 700, damping: 20 } });
  };

  const handleBlur = () => {
    animationControls.start({ y: 0, transition: { type: "spring" as const, stiffness: 700, damping: 20 } });
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue.match(/^[0-9]$/) || inputValue === '') {
      onChange(index, inputValue);
    }
  };

  const getBorderColor = () => {
    if (state === 'error') return 'ring-red-400';
    if (state === 'success') return 'ring-green-500';
    return 'ring-border focus-within:ring-muted-foreground';
  };

  const getBackgroundColor = () => {
    if (state === 'success') return 'bg-green-500/5';
    return 'bg-card';
  };

  return (
    <motion.div
      className={`w-12 h-14 md:w-14 md:h-16 rounded-xl ring-2 ${getBorderColor()} ${getBackgroundColor()} overflow-hidden transition-all duration-300`}
      initial={{ opacity: 0, y: 10 }}
      animate={animationControls}
    >
      <input
        id={`otp-input-${index}`}
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={handleInput}
        onKeyDown={(e) => onKeyDown(index, e)}
        onPaste={onPaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full h-full text-center text-2xl md:text-3xl font-semibold outline-none caret-foreground bg-transparent text-foreground"
        disabled={disabled || state === 'success'}
      />
    </motion.div>
  );
};

const TwoFactorVerification = ({
  email,
  onVerificationSuccess,
  onBack,
  context = 'login',
  skipInitialSend = false
}: TwoFactorVerificationProps) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [codeAlreadySent, setCodeAlreadySent] = useState(false);
  const [initialSendComplete, setInitialSendComplete] = useState(skipInitialSend);
  const [state, setState] = useState<'idle' | 'error' | 'success' | 'loading'>('idle');
  const { toast } = useToast();
  const animationControls = useAnimationControls();
  const initialSendRef = useRef(false);

  const timerKey = `2fa_timer_${context}_${email}`;

  const getInitialTimeLeft = () => {
    const stored = sessionStorage.getItem(timerKey);
    if (stored) {
      const { timeLeft: savedTime, timestamp } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - timestamp) / 1000);
      const remaining = savedTime - elapsed;
      if (remaining > 0) return remaining;
    }
    return 60;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const sendVerificationCode = useCallback(async () => {
    if (resendLoading) return;
    setResendLoading(true);
    try {
      if (context !== 'login' && context !== 'bank_details_change' && context !== 'withdrawal' && context !== 'password_change' && context !== 'disable_2fa' && context !== 'member_area_login') {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email,
          options: { emailRedirectTo: `${window.location.origin}/` }
        });
        if (error) throw error;
      } else {
        const eventTypeMap = {
          'login': 'admin_login',
          'bank_details_change': 'bank_details_change',
          'withdrawal': 'withdrawal',
          'password_change': 'password_change',
          'disable_2fa': 'disable_2fa',
          'member_area_login': 'member_area_login'
        };
        const eventType = eventTypeMap[context as keyof typeof eventTypeMap];
        const { data, error } = await supabase.functions.invoke('send-2fa-code', {
          body: { email, event_type: eventType, user_email: email }
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.message || 'Erro ao enviar código');
      }
      setCodeAlreadySent(true);
      setInitialSendComplete(true);
      toast({ title: "Código enviado!", description: "Verifique seu email para o código de 6 dígitos." });
      setTimeLeft(60);
      setIsResendDisabled(true);
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao enviar código. Tente novamente.", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  }, [email, toast, context, resendLoading]);

  useEffect(() => {
    if (initialSendRef.current) return;
    if (!skipInitialSend && !initialSendComplete) {
      if (context !== 'login' && context !== 'bank_details_change' && context !== 'withdrawal' && context !== 'password_change' && context !== 'disable_2fa' && context !== 'member_area_login') {
        setCodeAlreadySent(true);
        setInitialSendComplete(true);
      } else {
        initialSendRef.current = true;
        sendVerificationCode();
      }
    }
  }, [skipInitialSend, initialSendComplete, context, sendVerificationCode]);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isResendDisabled && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isResendDisabled, timeLeft]);

  // Save timer state
  useEffect(() => {
    if (timeLeft > 0) {
      sessionStorage.setItem(timerKey, JSON.stringify({ timeLeft, timestamp: Date.now() }));
    } else {
      sessionStorage.removeItem(timerKey);
    }
  }, [timeLeft, timerKey]);

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setState('idle');

    if (value && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }

    // Auto-verify when complete
    if (newCode.every(c => c !== '') && newCode.join('').length === 6) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    const digits = pastedData.split('').filter(char => /^[0-9]$/.test(char));
    
    if (digits.length === 6) {
      setCode(digits);
      document.getElementById('otp-input-5')?.focus();
      verifyCode(digits.join(''));
    }
  };

  const verifyCode = async (codeString: string) => {
    if (codeString.length !== 6) return;
    
    setLoading(true);
    setState('loading');
    
    try {
      if (context === 'login' || context === 'bank_details_change' || context === 'withdrawal' || context === 'password_change' || context === 'disable_2fa' || context === 'member_area_login') {
        const eventTypeMap = {
          'login': 'admin_login',
          'bank_details_change': 'bank_details_change',
          'withdrawal': 'withdrawal',
          'password_change': 'password_change',
          'disable_2fa': 'disable_2fa',
          'member_area_login': 'member_area_login'
        };
        const eventType = eventTypeMap[context];
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
          body: { email, code: codeString, event_type: eventType },
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        });
        
        if (error) throw error;
        if (!data.valid) throw new Error(data.message || 'Código incorreto ou expirado');
        
        setState('success');
        toast({ title: "Verificado!", description: "Código verificado com sucesso." });
        sessionStorage.removeItem(timerKey);
        
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: codeString,
        type: 'signup'
      });
      
      if (error) throw error;
      if (!data.session) throw new Error('Código incorreto ou expirado');
      
      setState('success');
      toast({ title: "Verificado!", description: "Email confirmado com sucesso." });
      sessionStorage.removeItem(timerKey);
      
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);
    } catch (error: any) {
      setState('error');
      await animationControls.start({
        x: [0, 5, -5, 5, -5, 0],
        transition: { duration: 0.3 }
      });
      toast({
        title: "Erro na verificação",
        description: error.message || "Código incorreto ou expirado.",
        variant: "destructive"
      });
      setCode(['', '', '', '', '', '']);
      document.getElementById('otp-input-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    sessionStorage.removeItem(timerKey);
    onBack();
  };

  const handleResend = () => {
    sendVerificationCode();
  };

  const getContextTitle = () => {
    switch (context) {
      case 'bank_details_change': return 'Verificação para Alterar IBAN';
      case 'withdrawal': return 'Confirmação de Saque';
      case 'password_change': return 'Verificação de Alteração de Senha';
      case 'disable_2fa': return 'Confirmação para Desativar 2FA';
      case 'member_area_login': return 'Verificação de Acesso';
      default: return 'Digite o Código de Verificação';
    }
  };

  // Logo component
  const LogoIcon = () => (
    <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
    </div>
  );

  return (
    <div className="rounded-3xl p-6 md:p-8 w-full max-w-sm relative overflow-hidden bg-card border border-border shadow-lg">
      <div className="relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <LogoIcon />
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-2">
          {state === "success" ? "Verificação Concluída!" : getContextTitle()}
        </h1>

        <AnimatePresence mode="wait">
          {state === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
              style={{ height: "180px" }}
            >
              <OTPSuccess />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Description */}
              <p className="text-center text-muted-foreground mt-2 mb-6 text-sm">
                {codeAlreadySent ? "Enviamos um código de 6 dígitos para" : "Enviando código para"}
                <br />
                <span className="font-medium text-foreground">{email}</span>
              </p>

              {/* OTP Input Area */}
              <div className="flex flex-col items-center justify-center gap-2 mb-8 relative">
                <motion.div animate={animationControls} className="flex items-center justify-center gap-2 md:gap-3">
                  {code.map((digit, index) => (
                    <OTPInputBox
                      key={`input-${index}`}
                      index={index}
                      value={digit}
                      onChange={handleCodeChange}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      state={state}
                      disabled={loading}
                    />
                  ))}
                </motion.div>
                <AnimatePresence>{state === "error" && <OTPError />}</AnimatePresence>
              </div>

              {/* Resend Link */}
              <div className="text-center text-sm mb-6">
                <span className="text-muted-foreground">Não recebeu o código? </span>
                {isResendDisabled ? (
                  <span className="text-muted-foreground/70">Reenviar em {timeLeft}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="font-medium text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded disabled:opacity-50"
                  >
                    {resendLoading ? 'Enviando...' : 'Clique para reenviar'}
                  </button>
                )}
              </div>

              {/* Back button */}
              <Button 
                onClick={handleBackClick} 
                variant="outline" 
                className="w-full"
                disabled={loading}
              >
                Voltar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
