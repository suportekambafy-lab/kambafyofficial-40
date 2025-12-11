import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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

// Success animation component
const OTPSuccess = ({ isMemberArea }: { isMemberArea: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
        className="w-16 h-16 flex items-center justify-center rounded-full"
        style={{
          backgroundColor: isMemberArea ? 'hsl(94, 55%, 45%)' : 'hsl(var(--checkout-green))',
          boxShadow: isMemberArea ? '0 0 30px hsla(94, 55%, 45%, 0.4)' : undefined
        }}
      >
        <CheckCircle2 className="w-8 h-8 text-white" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="font-semibold text-lg"
        style={{ color: isMemberArea ? 'hsl(94, 55%, 50%)' : 'hsl(var(--checkout-green))' }}
      >
        Código Verificado!
      </motion.p>
    </div>
  );
};

// Single OTP input box component
const OTPInputBox = ({ 
  index, 
  value, 
  onChange, 
  onKeyDown, 
  onPaste,
  state, 
  isMemberArea,
  disabled 
}: { 
  index: number; 
  value: string;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  state: 'idle' | 'error' | 'success' | 'loading';
  isMemberArea: boolean;
  disabled: boolean;
}) => {
  const animationControls = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    animationControls.start({
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 700, damping: 20, delay: index * 0.05 }
    });
  }, [animationControls, index]);

  const handleFocus = () => {
    animationControls.start({ y: -3, transition: { type: "spring", stiffness: 700, damping: 20 } });
  };

  const handleBlur = () => {
    animationControls.start({ y: 0, transition: { type: "spring", stiffness: 700, damping: 20 } });
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue.match(/^[0-9]$/) || inputValue === '') {
      onChange(index, inputValue);
    }
  };

  const getBorderColor = () => {
    if (state === 'error') return isMemberArea ? 'hsl(0, 70%, 50%)' : 'hsl(var(--destructive))';
    if (state === 'success') return isMemberArea ? 'hsl(94, 55%, 50%)' : 'hsl(var(--checkout-green))';
    return isMemberArea ? 'hsl(30, 10%, 30%)' : 'hsl(var(--border))';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={animationControls}
      className="relative"
    >
      <input
        ref={inputRef}
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
        disabled={disabled || state === 'success'}
        className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold rounded-xl outline-none transition-all duration-200 focus:ring-2"
        style={{
          backgroundColor: isMemberArea ? 'hsl(30, 15%, 18%)' : 'hsl(var(--background))',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: getBorderColor(),
          color: isMemberArea ? 'hsl(40, 20%, 95%)' : 'white',
          boxShadow: state === 'success' ? `0 0 15px ${isMemberArea ? 'hsla(94, 55%, 50%, 0.3)' : 'hsla(94, 55%, 55%, 0.3)'}` : undefined
        }}
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

  const isMemberArea = context === 'member_area_login';
  const timerKey = `2fa_timer_${context}_${email}`;

  const getInitialTimeLeft = () => {
    const stored = sessionStorage.getItem(timerKey);
    if (stored) {
      const { timeLeft: savedTime, timestamp } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - timestamp) / 1000);
      const remaining = savedTime - elapsed;
      if (remaining > 0) return remaining;
    }
    return 300;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

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
      setTimeLeft(300);
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

  useEffect(() => {
    if (timeLeft > 0) {
      sessionStorage.setItem(timerKey, JSON.stringify({ timeLeft, timestamp: Date.now() }));
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
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
        x: [0, 10, -10, 10, -10, 0],
        transition: { duration: 0.4 }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextTitle = () => {
    switch (context) {
      case 'bank_details_change': return 'Verificação para Alterar IBAN';
      case 'withdrawal': return 'Confirmação de Saque';
      case 'password_change': return 'Verificação de Alteração de Senha';
      case 'disable_2fa': return 'Confirmação para Desativar 2FA';
      case 'member_area_login': return 'Verificação de Acesso';
      default: return 'Verificação de Segurança';
    }
  };

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {state === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <OTPSuccess isMemberArea={isMemberArea} />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: isMemberArea ? 'hsl(40, 20%, 95%)' : 'white' }}>
                {getContextTitle()}
              </h2>
              <p className="text-sm" style={{ color: isMemberArea ? 'hsl(30, 10%, 60%)' : 'hsl(var(--muted-foreground))' }}>
                {codeAlreadySent ? "Digite o código de 6 dígitos enviado para" : "Enviando código para"}
              </p>
              <p className="font-medium mt-1" style={{ color: isMemberArea ? 'hsl(94, 55%, 50%)' : 'hsl(var(--checkout-green))' }}>
                {email}
              </p>
            </div>

            {/* OTP Input */}
            <motion.div 
              animate={animationControls}
              className="flex items-center justify-center gap-2 md:gap-3"
            >
              {code.map((digit, index) => (
                <OTPInputBox
                  key={index}
                  index={index}
                  value={digit}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  state={state}
                  isMemberArea={isMemberArea}
                  disabled={loading}
                />
              ))}
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {state === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center text-sm"
                  style={{ color: isMemberArea ? 'hsl(0, 70%, 55%)' : 'hsl(var(--destructive))' }}
                >
                  Código inválido. Tente novamente.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Timer */}
            <div className="text-center text-sm" style={{ color: isMemberArea ? 'hsl(30, 10%, 55%)' : 'hsl(var(--muted-foreground))' }}>
              {timeLeft > 0 ? (
                <p>Código expira em: <span className="font-mono font-medium">{formatTime(timeLeft)}</span></p>
              ) : (
                <p style={{ color: 'hsl(var(--destructive))' }}>Código expirado</p>
              )}
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-center">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <div className="text-center text-sm" style={{ color: isMemberArea ? 'hsl(30, 10%, 55%)' : 'hsl(var(--muted-foreground))' }}>
                <span>Não recebeu o código? </span>
                {timeLeft > 240 ? (
                  <span>Reenviar em {formatTime(timeLeft - 240)}</span>
                ) : (
                  <button
                    onClick={sendVerificationCode}
                    disabled={resendLoading}
                    className="font-medium underline hover:no-underline transition-all"
                    style={{ color: isMemberArea ? 'hsl(94, 55%, 50%)' : 'hsl(var(--checkout-green))' }}
                  >
                    {resendLoading ? 'Enviando...' : 'Clique para reenviar'}
                  </button>
                )}
              </div>

              <Button 
                onClick={handleBackClick} 
                variant="ghost" 
                className="w-full"
                style={isMemberArea ? { color: 'hsl(30, 10%, 55%)' } : {}}
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TwoFactorVerification;
