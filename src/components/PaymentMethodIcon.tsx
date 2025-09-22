import React from 'react';
import { 
  BankIcon, 
  EMolaIcon, 
  EPesaIcon, 
  CardIcon, 
  KlarnaIcon, 
  MultibancoIcon, 
  ApplePayIcon, 
  KambaPayIcon,
  KambafyLogo,
  KambafyIcon
} from './ui/svg-icons';

interface PaymentMethodIconProps {
  methodId: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ 
  methodId, 
  width = 40, 
  height = 40, 
  className = "" 
}) => {
  const renderIcon = () => {
    switch (methodId) {
      case 'express':
        return <img 
          src="/lovable-uploads/multicaixa-express-logo.svg" 
          alt="Multicaixa Express" 
          width={width}
          height={height}
          className={className}
        />;
      case 'reference':
      case 'transfer':
        return <BankIcon width={width} height={height} className={className} />;
      case 'emola':
        return <EMolaIcon width={width} height={height} className={className} />;
      case 'epesa':
        return <EPesaIcon width={width} height={height} className={className} />;
      case 'card':
        return <CardIcon width={width} height={height} className={className} />;
      case 'klarna':
        return <KlarnaIcon width={width} height={height} className={className} />;
      case 'multibanco':
        return <MultibancoIcon width={width} height={height} className={className} />;
      case 'apple_pay':
        return <ApplePayIcon width={width} height={height} className={className} />;
      case 'kambapay':
        return <KambaPayIcon width={width} height={height} className={className} />;
      default:
        return <div className={`${className} bg-gray-200 rounded flex items-center justify-center`} style={{width, height}}>
          <span className="text-xs text-gray-500">?</span>
        </div>;
    }
  };

  return renderIcon();
};

export const LogoIcon: React.FC<{ 
  type: 'full' | 'icon';
  width?: number | string;
  height?: number | string;
  className?: string;
}> = ({ type, width, height, className }) => {
  if (type === 'full') {
    return <KambafyLogo width={width} height={height} className={className} />;
  }
  return <KambafyIcon width={width} height={height} className={className} />;
};