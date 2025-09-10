import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

interface SignUpCodeVerificationProps {
  email: string;
  password: string;
  fullName: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
}

const SignUpCodeVerification = ({ 
  email, 
  password,
  fullName,
  onVerificationSuccess, 
  onBack
}: SignUpCodeVerificationProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos
  const [codeAlreadySent, setCodeAlreadySent] = useState(false);
  const { toast } = useToast();
  const { confirmSignUp } = useAuth();

  const sendVerificationCode = useCallback(async () => {
    if (resendLoading) return;
    
    setResendLoading(true);
    try {
      console.log('📧 Enviando código de verificação para:', email);
      
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: {
          email: email,
          event_type: 'signup',
          user_email: email
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar código:', error);
        throw error;
      }

      console.log('✅ Código enviado com sucesso:', data);
      setCodeAlreadySent(true);
      setTimeLeft(300); // Reset timer
      
      toast({
        title: "Código enviado!",
        description: "Verifique seu email para o código de verificação.",
      });
      
    } catch (error) {
      console.error('❌ Erro ao enviar código de verificação:', error);
      toast({
        title: "Erro ao enviar código",
        description: "Não foi possível enviar o código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  }, [email, resendLoading, toast]);

  // Enviar código inicial quando componente montar
  useEffect(() => {
    if (!codeAlreadySent) {
      sendVerificationCode();
    }
  }, [sendVerificationCode, codeAlreadySent]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && codeAlreadySent) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, codeAlreadySent]);

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Por favor, insira o código de 6 dígitos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Verificando código:', code);
      
      // Primeiro verificar o código
      const { data: verifyResponse, error: verifyError } = await supabase.functions.invoke('verify-2fa-code', {
        body: {
          email: email,
          code: code,
          event_type: 'signup'
        }
      });

      if (verifyError || !verifyResponse?.valid) {
        toast({
          title: "Código inválido",
          description: "O código inserido está incorreto ou expirado.",
          variant: "destructive"
        });
        return;
      }

      // Se código válido, confirmar o signup
      const result = await confirmSignUp(email, code);
      
      if (result.error) {
        toast({
          title: "Erro na confirmação",
          description: result.error.message || "Erro ao confirmar conta.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Conta confirmada!",
        description: "Sua conta foi criada e confirmada com sucesso.",
      });
      
      onVerificationSuccess();
      
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      toast({
        title: "Erro na verificação",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    onBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-6">
        <div className="animate-element animate-delay-50 flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <button
            onClick={handleBackClick}
            className="text-primary hover:underline"
          >
            ← Voltar
          </button>
          <span>•</span>
          <span>Verificação de Email</span>
        </div>

        <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
          <span className="font-light text-foreground tracking-tighter">Confirme seu Email</span>
        </h1>
        
        <p className="animate-element animate-delay-200 text-muted-foreground">
          Enviamos um código de verificação para <strong>{email}</strong>
        </p>

        <div className="animate-element animate-delay-300 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="verification-code" className="text-sm font-medium">
              Código de verificação
            </Label>
            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                value={code} 
                onChange={setCode}
                disabled={loading}
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

          <Button 
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            className="w-full"
            size="lg"
          >
            {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
            Confirmar Código
          </Button>

          <div className="text-center space-y-2">
            {timeLeft > 0 ? (
              <p className="text-sm text-muted-foreground">
                Reenviar código em {formatTime(timeLeft)}
              </p>
            ) : (
              <Button
                variant="link"
                onClick={sendVerificationCode}
                disabled={resendLoading}
                className="text-sm"
              >
                {resendLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Enviando...
                  </>
                ) : (
                  'Reenviar código'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpCodeVerification;