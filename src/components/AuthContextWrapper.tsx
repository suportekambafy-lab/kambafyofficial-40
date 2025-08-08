
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Intelligent2FAGate from './Intelligent2FAGate';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import PushPermissionPrompt from './PushPermissionPrompt';

interface AuthContextWrapperProps {
  children: React.ReactNode;
}

const AuthContextWrapper: React.FC<AuthContextWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const [pendingLogin, setPendingLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // Inicializa Web Push quando autenticado
  usePushNotifications();

  // Este componente será usado para interceptar logins e aplicar 2FA inteligente
  const handleLoginAttempt = (email: string) => {
    setLoginEmail(email);
    setPendingLogin(true);
  };

  const handleLoginSuccess = () => {
    setPendingLogin(false);
    setLoginEmail('');
  };

  const handleLoginCancel = () => {
    setPendingLogin(false);
    setLoginEmail('');
  };

  if (pendingLogin && loginEmail) {
    return (
      <Intelligent2FAGate
        eventType="login"
        onSuccess={handleLoginSuccess}
        onCancel={handleLoginCancel}
        userEmail={loginEmail}
      />
    );
  }

  return (
    <>
      {children}
    </>
  );
};

export default AuthContextWrapper;
