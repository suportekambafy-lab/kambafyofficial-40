
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
  context?: 'login' | 'bank_details_change' | 'withdrawal' | 'password_change' | 'disable_2fa';
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
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
  const [codeAlreadySent, setCodeAlreadySent] = useState(false);
  const [initialSendComplete, setInitialSendComplete] = useState(skipInitialSend);
  const { toast } = useToast();

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
      const newCode = generateCode();
      
      console.log('📧 Enviando código 2FA:', newCode);
      
      // Armazenar código temporariamente no localStorage com timestamp
      const codeData = {
        code: newCode,
        email: email,
        context: context,
        timestamp: Date.now()
      };
      localStorage.setItem('2fa_code', JSON.stringify(codeData));

      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: {
          email: email,
          event_type: context === 'login' ? 'admin_login' : context,
          context: context
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Código 2FA enviado com sucesso');
      setCodeAlreadySent(true);
      setInitialSendComplete(true);
      toast({
        title: "Código enviado!",
        description: "Verifique seu email para o código de verificação.",
      });

      setTimeLeft(300); // Reset timer
    } catch (error) {
      console.error('❌ Erro ao enviar código 2FA:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  }, [email, context, generateCode, toast]);

  // Envio inicial do código - usando useRef para evitar loop
  const hasInitialSendRun = useRef(false);
  
  useEffect(() => {
    if (!initialSendComplete && !skipInitialSend && !hasInitialSendRun.current) {
      console.log('🔒 TwoFactorVerification mount - enviando código inicial');
      hasInitialSendRun.current = true;
      sendVerificationCode();
    } else if (skipInitialSend && !hasInitialSendRun.current) {
      console.log('🔒 TwoFactorVerification - pulando envio inicial (sessão restaurada)');
      hasInitialSendRun.current = true;
      setCodeAlreadySent(true);
      setInitialSendComplete(true);
      
      // Verificar se há código válido armazenado
      const storedData = localStorage.getItem('2fa_code');
      if (storedData) {
        try {
          const { timestamp } = JSON.parse(storedData);
          const remainingTime = Math.max(0, 300 - Math.floor((Date.now() - timestamp) / 1000));
          if (remainingTime > 0) {
            setTimeLeft(remainingTime);
          } else {
            // Código expirado, limpar
            localStorage.removeItem('2fa_code');
          }
        } catch (error) {
          console.error('Erro ao processar código armazenado:', error);
          localStorage.removeItem('2fa_code');
        }
      }
    }
  }, [skipInitialSend, initialSendComplete]); // Removido sendVerificationCode das dependências

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

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
      console.log('🔍 Verificando código:', code);
      
      // Usar a edge function para verificar o código
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: {
          email: email,
          code: code,
          event_type: context === 'login' ? 'admin_login' : context
        }
      });

      if (error) {
        throw error;
      }

      if (!data || !data.valid) {
        throw new Error(data?.message || 'Código incorreto');
      }

      // Limpar código armazenado localmente se existir
      localStorage.removeItem('2fa_code');
      
      console.log('✅ Código verificado com sucesso');
      toast({
        title: "Verificado!",
        description: "Código verificado com sucesso.",
      });

      console.log('✅ Chamando onVerificationSuccess');
      onVerificationSuccess();
    } catch (error: any) {
      console.error('❌ Erro na verificação 2FA:', error);
      let message = "Código incorreto ou expirado.";
      
      if (error.message?.includes('inválido') || error.message?.includes('expirado')) {
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
