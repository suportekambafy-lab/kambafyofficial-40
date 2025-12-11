import React from 'react';
import TwoFactorVerification from './TwoFactorVerification';
import KambafyLogo from '@/assets/kambafy-logo-gray.svg';
import { motion } from 'framer-motion';

interface TwoFactorCardProps {
  email: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
  context?: 'login' | 'bank_details_change' | 'withdrawal' | 'password_change' | 'disable_2fa' | 'member_area_login';
  skipInitialSend?: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * TwoFactorCard - A styled wrapper for TwoFactorVerification
 * Use this component when you want the full card design with logo
 */
export function TwoFactorCard({
  email,
  onVerificationSuccess,
  onBack,
  context = 'login',
  skipInitialSend = false,
  title,
  subtitle
}: TwoFactorCardProps) {
  const getDefaultTitle = () => {
    switch (context) {
      case 'bank_details_change': return 'Verificação para Alterar IBAN';
      case 'withdrawal': return 'Confirmação de Saque';
      case 'password_change': return 'Verificação de Alteração de Senha';
      case 'disable_2fa': return 'Confirmação para Desativar 2FA';
      case 'member_area_login': return 'Verificação de Acesso';
      default: return 'Verificação de Segurança';
    }
  };

  const getDefaultSubtitle = () => {
    switch (context) {
      case 'bank_details_change': return 'Por segurança, confirme sua identidade para alterar dados bancários';
      case 'withdrawal': return 'Confirme sua identidade para realizar o saque';
      case 'password_change': return 'Confirme sua identidade para alterar sua senha';
      case 'disable_2fa': return 'Confirme sua identidade para desativar a autenticação em dois fatores';
      case 'member_area_login': return 'Detectamos um novo navegador. Confirme sua identidade';
      default: return 'Digite o código de verificação enviado para seu email';
    }
  };

  return (
    <div className="rounded-3xl p-6 md:p-8 w-full max-w-sm relative overflow-hidden bg-card border border-border shadow-lg mx-auto">
      <div className="relative z-10">
        {/* Logo Kambafy */}
        <motion.div 
          className="flex justify-center mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-foreground rounded-2xl flex items-center justify-center p-2.5 shadow-lg">
            <img 
              src={KambafyLogo} 
              alt="Kambafy" 
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-2">
          {title || getDefaultTitle()}
        </h1>
        
        {/* Subtitle */}
        <p className="text-center text-muted-foreground text-sm mb-6">
          {subtitle || getDefaultSubtitle()}
        </p>

        {/* 2FA Verification */}
        <TwoFactorVerification
          email={email}
          context={context}
          onVerificationSuccess={onVerificationSuccess}
          onBack={onBack}
          skipInitialSend={skipInitialSend}
        />
      </div>
    </div>
  );
}

export default TwoFactorCard;
