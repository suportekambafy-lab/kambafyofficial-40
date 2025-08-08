import React from 'react';
import { CreditCard, Building2, ArrowRightLeft, Smartphone, Zap, Apple } from 'lucide-react';

interface PaymentMethodIconProps {
  methodId: string;
  className?: string;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ methodId, className = "w-6 h-6" }) => {
  const getIcon = () => {
    switch (methodId) {
      case 'express':
        return <Zap className={`${className} text-blue-600`} />;
      case 'reference':
        return <Building2 className={`${className} text-orange-600`} />;
      case 'transfer':
        return <ArrowRightLeft className={`${className} text-green-600`} />;
      case 'emola':
        return <Smartphone className={`${className} text-blue-500`} />;
      case 'epesa':
        return <Smartphone className={`${className} text-red-500`} />;
      case 'card':
        return <CreditCard className={`${className} text-blue-700`} />;
      case 'klarna':
        return (
          <div className={`${className} bg-pink-100 rounded flex items-center justify-center`}>
            <span className="text-pink-600 font-bold text-xs">K</span>
          </div>
        );
      case 'multibanco':
        return (
          <div className={`${className} bg-blue-100 rounded flex items-center justify-center`}>
            <span className="text-blue-600 font-bold text-xs">MB</span>
          </div>
        );
      case 'apple_pay':
        return <Apple className={`${className} text-gray-800`} />;
      default:
        return <CreditCard className={`${className} text-gray-600`} />;
    }
  };

  return getIcon();
};