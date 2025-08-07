
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Smartphone, Monitor } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';
import TwoFactorVerification from './TwoFactorVerification';

interface Intelligent2FAGateProps {
  eventType: 'login' | 'password_change' | 'bank_details_change' | 'withdrawal' | 'suspicious_ip';
  onSuccess: () => void;
  onCancel?: () => void;
  userEmail?: string;
  children?: React.ReactNode;
}

const Intelligent2FAGate: React.FC<Intelligent2FAGateProps> = ({
  eventType,
  onSuccess,
  onCancel,
  userEmail,
  children
}) => {
  const { 
    requires2FA, 
    logSecurityEvent, 
    trustDevice, 
    deviceContext,
    settings 
  } = use2FA();
  
  const [showDialog, setShowDialog] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [trustThisDevice, setTrustThisDevice] = useState(true); // Default true para ser mais permissivo
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkIfNeeds2FA();
  }, [eventType, settings]);

  const checkIfNeeds2FA = async () => {
    console.log('🔍 Verificando se precisa de 2FA para:', eventType);
    console.log('🔍 Configurações 2FA:', settings);
    
    if (!settings?.enabled) {
      console.log('✅ 2FA não ativado - acesso liberado');
      onSuccess();
      return;
    }

    setChecking(true);
    
    try {
      const needs2FA = await requires2FA(eventType);
      
      if (needs2FA) {
        console.log('🔒 2FA Inteligente: Solicitando autenticação para', eventType);
        setShowDialog(true);
      } else {
        console.log('✅ 2FA Inteligente: Acesso liberado para', eventType);
        await logSecurityEvent(eventType, false);
        
        if (eventType === 'login') {
          await trustDevice();
        }
        
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao verificar 2FA:', error);
      console.log('✅ Erro na verificação 2FA - liberando acesso por segurança');
      await logSecurityEvent(eventType, false);
      onSuccess();
    }
    
    setChecking(false);
  };

  const handleProceedWith2FA = () => {
    setShowDialog(false);
    setShow2FA(true);
  };

  const handle2FASuccess = async () => {
    // Registrar evento com 2FA verificado
    await logSecurityEvent(eventType, true);
    
    // Sempre confiar no dispositivo após 2FA bem-sucedido
    if (trustThisDevice) {
      await trustDevice();
    }
    
    setShow2FA(false);
    onSuccess();
  };

  const handleCancel = () => {
    setShowDialog(false);
    setShow2FA(false);
    if (onCancel) {
      onCancel();
    }
  };

  // Simplificar as mensagens para ser menos alarmante
  const getEventMessage = () => {
    switch (eventType) {
      case 'login':
        return 'Verificação de segurança para novo dispositivo.';
      case 'password_change':
        return 'Confirmação necessária para alteração de senha.';
      case 'bank_details_change':
        return 'Verificação necessária para dados bancários.';
      case 'withdrawal':
        return 'Confirmação necessária para saque.';
      case 'suspicious_ip':
        return 'Verificação de segurança adicional detectada.';
      default:
        return 'Verificação de segurança necessária.';
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <span>Verificando acesso...</span>
      </div>
    );
  }

  if (show2FA && userEmail) {
    return (
      <TwoFactorVerification
        email={userEmail}
        onVerificationSuccess={handle2FASuccess}
        onBack={handleCancel}
      />
    );
  }

  return (
    <>
      {children}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Verificação Rápida
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                {getEventMessage()}
              </p>
            </div>

            {deviceContext && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span>{deviceContext.browser} em {deviceContext.os}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>{deviceContext.location}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm">
                Verificação rápida para garantir a segurança da sua conta.
              </p>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trust-device"
                  checked={trustThisDevice}
                  onCheckedChange={(checked) => setTrustThisDevice(checked as boolean)}
                />
                <label
                  htmlFor="trust-device"
                  className="text-sm text-foreground cursor-pointer"
                >
                  Lembrar este dispositivo por 90 dias
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleProceedWith2FA} className="flex-1">
                Verificar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Intelligent2FAGate;
