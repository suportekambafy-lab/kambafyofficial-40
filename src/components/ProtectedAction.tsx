
import React, { useState } from 'react';
import { use2FA } from '@/hooks/use2FA';
import { useAuth } from '@/contexts/AuthContext';
import Intelligent2FAGate from './Intelligent2FAGate';

interface ProtectedActionProps {
  eventType: 'login' | 'password_change' | 'bank_details_change' | 'withdrawal' | 'suspicious_ip';
  onAction: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const ProtectedAction: React.FC<ProtectedActionProps> = ({
  eventType,
  onAction,
  children,
  className
}) => {
  const { user } = useAuth();
  const { requires2FA, logSecurityEvent } = use2FA();
  const [showVerification, setShowVerification] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleClick = async () => {
    if (!user) return;
    
    console.log('🔒 ProtectedAction: Verificando necessidade de 2FA para:', eventType);
    setIsChecking(true);
    
    try {
      const needs2FA = await requires2FA(eventType);
      console.log('🔒 ProtectedAction: Precisa de 2FA?', needs2FA);
      
      if (needs2FA) {
        console.log('🔒 ProtectedAction: Solicitando 2FA para:', eventType);
        setShowVerification(true);
      } else {
        console.log('✅ ProtectedAction: Executando ação sem 2FA:', eventType);
        await logSecurityEvent(eventType, false);
        await onAction();
      }
    } catch (error) {
      console.error('Erro ao verificar 2FA:', error);
      // Em caso de erro, executar a ação normalmente
      await onAction();
    } finally {
      setIsChecking(false);
    }
  };

  const handle2FASuccess = async () => {
    console.log('✅ ProtectedAction: 2FA verificado com sucesso para:', eventType);
    await logSecurityEvent(eventType, true);
    setShowVerification(false);
    await onAction();
  };

  const handle2FACancel = () => {
    console.log('❌ ProtectedAction: 2FA cancelado para:', eventType);
    setShowVerification(false);
  };

  if (showVerification && user) {
    return (
      <Intelligent2FAGate
        eventType={eventType}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
        userEmail={user.email || ''}
      />
    );
  }

  return (
    <div className={className} onClick={handleClick}>
      {isChecking ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
          Verificando...
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default ProtectedAction;
