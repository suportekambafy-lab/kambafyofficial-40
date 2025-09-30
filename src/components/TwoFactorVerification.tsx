
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
      console.log('📧 Reenviando código de confirmação do Supabase');
      
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
      setCodeAlreadySent(true);
      setInitialSendComplete(true);
      toast({
        title: "Código enviado!",
        description: "Verifique seu email para o código de verificação de 6 dígitos.",
      });

      setTimeLeft(300); // Reset timer
    } catch (error) {
      console.error('❌ Erro ao reenviar código:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  }, [email, toast]);

  // Marcar que o código já foi enviado automaticamente pelo Supabase
  useEffect(() => {
    if (!skipInitialSend) {
      console.log('🔒 Email de confirmação já enviado pelo Supabase no signup');
      setCodeAlreadySent(true);
      setInitialSendComplete(true);
    }
  }, [skipInitialSend]);

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
      console.log('🔍 Verificando código do Supabase:', code);
      
      // Usar verifyOtp nativo do Supabase para confirmar email
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'signup'
      });

      if (error) {
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
