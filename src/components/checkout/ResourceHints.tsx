import { Helmet } from 'react-helmet-async';
import { memo } from 'react';

interface ResourceHintsProps {
  selectedPayment?: string;
  userCountry?: string;
}

export const ResourceHints = memo(({ selectedPayment, userCountry }: ResourceHintsProps) => {
  return (
    <Helmet>
      {/* DNS Prefetch para domínios externos críticos */}
      <link rel="dns-prefetch" href="https://hcbkqygdtzpxvctfdqbd.supabase.co" />
      <link rel="dns-prefetch" href="https://api.stripe.com" />
      <link rel="dns-prefetch" href="https://js.stripe.com" />
      
      {/* Preconnect para APIs que serão usadas com certeza */}
      <link rel="preconnect" href="https://hcbkqygdtzpxvctfdqbd.supabase.co" crossOrigin="anonymous" />
      
      {/* Preconnect condicional baseado no método de pagamento selecionado */}
      {(selectedPayment === 'stripe' || selectedPayment === 'card' || selectedPayment === 'klarna' || selectedPayment === 'multibanco' || selectedPayment === 'mbway') && (
        <>
          <link rel="preconnect" href="https://api.stripe.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        </>
      )}
      
      {(selectedPayment === 'kambapay' || userCountry === 'AO') && (
        <link rel="dns-prefetch" href="https://appypay.com" />
      )}
      
      {/* Prefetch de recursos que provavelmente serão necessários */}
      {selectedPayment === 'stripe' && (
        <link rel="prefetch" href="https://js.stripe.com/v3/" as="script" />
      )}
    </Helmet>
  );
});

ResourceHints.displayName = 'ResourceHints';
