import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TwoFactorDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  loading?: boolean;
  email?: string;
  context?: 'login' | 'bank_details_change' | 'withdrawal' | 'password_change' | 'disable_2fa';
  autoSendCode?: boolean;
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
        Verificado!
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

// Single OTP input box component
const OTPInputBox = ({ 
  index, 
  value,
  onChange,
  onKeyDown,
  onPaste,
  state, 
  disabled 
}: { 
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  state: 'idle' | 'error' | 'success' | 'loading';
  disabled: boolean;
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

  return (
    <motion.div
      className={`w-12 h-14 md:w-14 md:h-16 rounded-xl ring-2 ${getBorderColor()} overflow-hidden transition-all duration-300 bg-card`}
      initial={{ opacity: 0, y: 10 }}
      animate={animationControls}
    >
      <input
        id={`dialog-otp-input-${index}`}
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

export function TwoFactorDialog({ 
  open, 
  onClose, 
  onSubmit, 
  loading = false,
  email,
  context = 'login',
  autoSendCode = true
}: TwoFactorDialogProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [state, setState] = useState<'idle' | 'error' | 'success' | 'loading'>('idle');
  const [countdown, setCountdown] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const animationControls = useAnimationControls();
  const { toast } = useToast();
  const initialSendRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCode(['', '', '', '', '', '']);
      setState('idle');
      setCountdown(60);
      setIsResendDisabled(true);
      initialSendRef.current = false;
      
      // Focus first input after a short delay
      setTimeout(() => {
        document.getElementById('dialog-otp-input-0')?.focus();
      }, 100);

      // Auto send code if email provided
      if (autoSendCode && email && !initialSendRef.current) {
        initialSendRef.current = true;
        sendCode();
      }
    }
  }, [open, email, autoSendCode]);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open && isResendDisabled && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [open, isResendDisabled, countdown]);

  const sendCode = useCallback(async () => {
    if (!email || resendLoading) return;
    
    setResendLoading(true);
    try {
      const eventTypeMap = {
        'login': 'admin_login',
        'bank_details_change': 'bank_details_change',
        'withdrawal': 'withdrawal',
        'password_change': 'password_change',
        'disable_2fa': 'disable_2fa'
      };
      const eventType = eventTypeMap[context];
      
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { email, event_type: eventType, user_email: email }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.message || 'Erro ao enviar código');
      
      toast({ title: "Código enviado!", description: "Verifique seu email." });
      setCountdown(60);
      setIsResendDisabled(true);
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao enviar código.", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  }, [email, context, toast, resendLoading]);

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setState('idle');

    if (value && index < 5) {
      document.getElementById(`dialog-otp-input-${index + 1}`)?.focus();
    }

    // Auto-verify when complete
    if (newCode.every(c => c !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`dialog-otp-input-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      document.getElementById(`dialog-otp-input-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      document.getElementById(`dialog-otp-input-${index + 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    const digits = pastedData.split('').filter(char => /^[0-9]$/.test(char));
    
    if (digits.length === 6) {
      setCode(digits);
      document.getElementById('dialog-otp-input-5')?.focus();
      handleVerify(digits.join(''));
    }
  };

  const handleVerify = async (codeString: string) => {
    if (loading) return;
    setState('loading');
    
    try {
      onSubmit(codeString);
      setState('success');
    } catch (error) {
      setState('error');
      await animationControls.start({
        x: [0, 5, -5, 5, -5, 0],
        transition: { duration: 0.3 }
      });
      setCode(['', '', '', '', '', '']);
      document.getElementById('dialog-otp-input-0')?.focus();
    }
  };

  const getContextTitle = () => {
    switch (context) {
      case 'bank_details_change': return 'Verificação para Alterar IBAN';
      case 'withdrawal': return 'Confirmação de Saque';
      case 'password_change': return 'Verificação de Alteração de Senha';
      case 'disable_2fa': return 'Confirmação para Desativar 2FA';
      default: return 'Verificação de Segurança';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 border-none bg-transparent shadow-none">
        <div className="rounded-3xl p-6 md:p-8 w-full relative overflow-hidden bg-card border border-border shadow-lg">
          <div className="relative z-10">

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
                    Enviamos um código de 6 dígitos para
                    <br />
                    <span className="font-medium text-foreground">{email || 'seu email'}</span>
                  </p>

                  {/* OTP Input Area */}
                  <div className="flex flex-col items-center justify-center gap-2 mb-8 relative">
                    <motion.div animate={animationControls} className="flex items-center justify-center gap-2 md:gap-3">
                      {code.map((digit, index) => (
                        <OTPInputBox
                          key={`dialog-input-${index}`}
                          index={index}
                          value={digit}
                          onChange={handleCodeChange}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          state={state}
                          disabled={loading || state === 'loading'}
                        />
                      ))}
                    </motion.div>
                    <AnimatePresence>{state === "error" && <OTPError />}</AnimatePresence>
                  </div>

                  {/* Resend Link */}
                  <div className="text-center text-sm mb-6">
                    <span className="text-muted-foreground">Não recebeu o código? </span>
                    {isResendDisabled ? (
                      <span className="text-muted-foreground/70">Reenviar em {countdown}s</span>
                    ) : (
                      <button
                        onClick={sendCode}
                        disabled={resendLoading}
                        className="font-medium text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded disabled:opacity-50"
                      >
                        {resendLoading ? 'Enviando...' : 'Clique para reenviar'}
                      </button>
                    )}
                  </div>

                  {/* Cancel button */}
                  <Button 
                    onClick={onClose} 
                    variant="outline" 
                    className="w-full"
                    disabled={loading || state === 'loading'}
                  >
                    Cancelar
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
