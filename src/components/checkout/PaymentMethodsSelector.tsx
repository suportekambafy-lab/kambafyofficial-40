
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { getPaymentMethodsByCountry, PaymentMethod } from '@/utils/paymentMethods';
import { getCurrencyInfo } from '@/hooks/useCurrencyToCountry';

interface PaymentMethodsSelectorProps {
  selectedMethod: string;
  onMethodSelect: (method: string) => void;
  productPrice: number;
  disabled?: boolean;
}

export function PaymentMethodsSelector({ 
  selectedMethod, 
  onMethodSelect, 
  productPrice, 
  disabled 
}: PaymentMethodsSelectorProps) {
  const { country } = useGeoLocation();
  const availableMethods = getPaymentMethodsByCountry(country || 'AO');

  const formatPrice = (price: number, currency: string = 'KZ') => {
    return `${parseFloat(price.toString()).toLocaleString('pt-BR')} ${currency}`;
  };

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'reference':
        return '📄';
      case 'express':
        return '💳';
      case 'transfer':
        return '🏦';
      case 'emola':
        return '📱';
      case 'epesa':
        return '📱';
      case 'card':
        return '💳';
      case 'klarna':
        return '🛒';
      case 'multibanco':
        return '🏧';
      case 'apple_pay':
        return '🍎';
      case 'kambapay':
        return '💰';
      default:
        return '💳';
    }
  };

  const getMethodDescription = (method: PaymentMethod) => {
    switch (method.id) {
      case 'reference':
        return 'Pagamento por referência bancária';
      case 'express':
        return 'Pagamento via Multicaixa Express';
      case 'transfer':
        return 'Transferência bancária direta';
      case 'emola':
        return 'Carteira móvel e-Mola';
      case 'epesa':
        return 'Carteira móvel e-Pesa';
      case 'card':
        return 'Cartão de crédito/débito';
      case 'klarna':
        return 'Compre agora, pague depois';
      case 'multibanco':
        return 'Pagamento via Multibanco';
      case 'apple_pay':
        return 'Pagamento via Apple Pay';
      case 'kambapay':
        return 'Saldo digital KambaPay';
      default:
        return method.name;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Escolha o método de pagamento</h3>
      
      {availableMethods.map((method) => (
        <Card
          key={method.id}
          className={`cursor-pointer transition-all duration-200 ${
            selectedMethod === method.id 
              ? 'ring-2 ring-primary border-primary' 
              : 'hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={!disabled ? () => onMethodSelect(method.id) : undefined}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getMethodIcon(method.id)}
                </div>
                <div>
                  <h4 className="font-semibold">{method.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getMethodDescription(method)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(productPrice)}</p>
                {method.countryFlag && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <span>{method.countryFlag}</span>
                    <span>{method.countryName}</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
