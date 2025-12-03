
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface TwoFactorVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
  context?: 'login' | 'bank_details_change' | 'withdrawal' | 'password_change' | 'disable_2fa' | 'member_area_login';
  skipInitialSend?: boolean;
}

const TwoFactorVerification = ({ 
  email, 
  onVerificationSuccess, 
  onBack, 
  context = 'login',
  skipInitialSend = false 
}: TwoFactorVerificationProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [codeAlreadySent, setCodeAlreadySent] = useState(false);
  const [initialSendComplete, setInitialSendComplete] = useState(skipInitialSend);
  const { toast } = useToast();
  
  // Ref para evitar envio duplicado de código
  const initialSendRef = useRef(false);
  
  // Chave única para o timer baseada no contexto e email
  const timerKey = `2fa_timer_${context}_${email}`;
  
  // Inicializar o timer a partir do sessionStorage ou 300 segundos
  const getInitialTimeLeft = () => {
    const stored = sessionStorage.getItem(timerKey);
    if (stored) {
      const { timeLeft: savedTime, timestamp } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - timestamp) / 1000);
      const remaining = savedTime - elapsed;
      if (remaining > 0) {
        return remaining;
      }
    }
    return 300; // 5 minutos
  };
  
  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

  console.log('🔒 TwoFactorVerification render - context:', context);
  console.log('🔒 TwoFactorVerification render - email:', email);
  console.log('🔒 TwoFactorVerification render - skipInitialSend:', skipInitialSend);

  const generateCode = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  const sendVerificationCode = useCallback(async () => {
    if (resendLoading) return;
    
    setResendLoading(true);
    try {
      // Para contextos customizados, usar a edge function send-2fa-code
      if (context !== 'login' && context !== 'bank_details_change' && context !== 'withdrawal' && context !== 'password_change' && context !== 'disable_2fa' && context !== 'member_area_login') {
        console.log('📧 Reenviando código de confirmação do Supabase (signup)');
        
        // Usar resend nativo do Supabase para signup
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
        });

        if (error) {
          throw error;
        }

        console.log('✅ Código reenviado com sucesso pelo Supabase');
      } else {
        console.log('📧 Enviando código 2FA via edge function - contexto:', context);
        
        // Mapear contexto para event_type
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
          body: {
            email: email,
            event_type: eventType,
            user_email: email
          }
        });

        if (error) {
          console.error('❌ Erro ao chamar edge function:', error);
          throw error;
        }

        if (!data.success) {
          throw new Error(data.message || 'Erro ao enviar código');
        }

        console.log('✅ Código enviado com sucesso via edge function');
      }
      
      setCodeAlreadySent(true);
      setInitialSendComplete(true);
      toast({
        title: "Código enviado!",
        description: "Verifique seu email para o código de verificação de 6 dígitos.",
      });

      setTimeLeft(300); // Reset timer
    } catch (error) {
      console.error('❌ Erro ao enviar código:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  }, [email, toast, context]);

  // Enviar código automaticamente se necessário
  useEffect(() => {
    // Evitar envio duplicado usando ref
    if (initialSendRef.current) {
      return;
    }
    
    if (!skipInitialSend && !initialSendComplete) {
      // Para signup, o código já foi enviado pelo Supabase
      if (context !== 'login' && context !== 'bank_details_change' && context !== 'withdrawal' && context !== 'password_change' && context !== 'disable_2fa' && context !== 'member_area_login') {
        console.log('🔒 Email de confirmação já enviado pelo Supabase no signup');
        setCodeAlreadySent(true);
        setInitialSendComplete(true);
      } else {
        // Marcar como enviando para evitar duplicação
        initialSendRef.current = true;
        // Para contextos customizados, enviar código automaticamente
        console.log('🔒 Enviando código automaticamente para contexto:', context);
        sendVerificationCode();
      }
    }
  }, [skipInitialSend, initialSendComplete, context, sendVerificationCode]);

  // Countdown timer - persistir no sessionStorage
  useEffect(() => {
    if (timeLeft > 0) {
      // Salvar tempo restante no sessionStorage
      sessionStorage.setItem(timerKey, JSON.stringify({
        timeLeft,
        timestamp: Date.now()
      }));
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Timer expirou, limpar do sessionStorage
      sessionStorage.removeItem(timerKey);
    }
  }, [timeLeft, timerKey]);
  
  // Limpar timer do sessionStorage quando o componente é desmontado (só se verificação foi bem sucedida)
  useEffect(() => {
    return () => {
      // Não limpar aqui pois queremos preservar ao navegar
    };
  }, []);

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Digite o código de 6 dígitos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Verificando código - contexto:', context);
      console.log('🔍 Email:', email);
      console.log('🔍 Código:', code);
      
      // Para admin_login e outros contextos customizados, usar edge function
      if (context === 'login' || context === 'bank_details_change' || context === 'withdrawal' || context === 'password_change' || context === 'disable_2fa' || context === 'member_area_login') {
        console.log('🔍 Usando edge function verify-2fa-code para contexto:', context);
        
        // Mapear contexto para event_type
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
          body: {
            email: email,
            code: code,
            event_type: eventType
          },
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`
          } : {}
        });

        if (error) {
          console.error('❌ Erro ao chamar edge function:', error);
          throw error;
        }

        console.log('✅ Resposta do edge function:', data);

        if (!data.valid) {
          throw new Error(data.message || 'Código incorreto ou expirado');
        }

        console.log('✅ Código verificado com sucesso via edge function');
        toast({
          title: "Verificado!",
          description: "Código verificado com sucesso.",
        });

        // Limpar timer do sessionStorage após verificação bem sucedida
        sessionStorage.removeItem(timerKey);
        
        console.log('✅ Chamando onVerificationSuccess');
        onVerificationSuccess();
        return;
      }
      
      // Para signup, usar verifyOtp nativo do Supabase
      console.log('🔍 Usando supabase.auth.verifyOtp para signup');
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'signup'
      });

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        throw error;
      }

      if (!data.session) {
        throw new Error('Código incorreto ou expirado');
      }

      console.log('✅ Código verificado com sucesso pelo Supabase');
      toast({
        title: "Verificado!",
        description: "Email confirmado com sucesso.",
      });

      // Limpar timer do sessionStorage após verificação bem sucedida
      sessionStorage.removeItem(timerKey);
      
      console.log('✅ Chamando onVerificationSuccess');
      onVerificationSuccess();
    } catch (error: any) {
      console.error('❌ Erro na verificação:', error);
      let message = "Código incorreto ou expirado.";
      
      if (error.message) {
        message = error.message;
      }

      toast({
        title: "Erro na verificação",
        description: message,
        variant: "destructive"
      });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('⬅️ Voltando da verificação 2FA');
    // Limpar timer do sessionStorage ao cancelar
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
      case 'bank_details_change':
        return 'Verificação para Alterar IBAN';
      case 'withdrawal':
        return 'Confirmação de Saque';
      case 'password_change':
        return 'Verificação de Alteração de Senha'; 
      case 'disable_2fa':
        return 'Confirmação para Desativar 2FA';
      default:
        return 'Verificação de Segurança';
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">
          {getContextTitle()}
        </h1>
        <p className="text-muted-foreground mt-2">
          {codeAlreadySent 
            ? "Digite o código de 6 dígitos enviado para"
            : "Enviamos um código de 6 dígitos para"
          }
        </p>
        <p className="font-medium text-checkout-green">
          {email}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-code">Código de Verificação</Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {timeLeft > 0 ? (
            <p>Código expira em: <span className="font-mono">{formatTime(timeLeft)}</span></p>
          ) : (
            <p className="text-destructive">Código expirado</p>
          )}
        </div>

        <Button
          onClick={verifyCode}
          className="w-full bg-checkout-green hover:bg-checkout-green/90"
          disabled={loading || code.length !== 6}
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Verificar Código'}
        </Button>

        <div className="space-y-2">
          <Button
            onClick={sendVerificationCode}
            variant="outline"
            className="w-full"
            disabled={resendLoading || timeLeft > 240} // Pode reenviar após 1 minuto
          >
            {resendLoading ? <LoadingSpinner size="sm" /> : (codeAlreadySent ? 'Reenviar Código' : 'Enviar Código')}
          </Button>
          
          {timeLeft > 240 && (
            <p className="text-xs text-center text-muted-foreground">
              Aguarde {formatTime(timeLeft - 240)} para reenviar
            </p>
          )}
        </div>

        <Button
          onClick={handleBackClick}
          variant="ghost"
          className="w-full"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
