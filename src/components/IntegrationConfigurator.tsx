
import React from 'react';
import { FacebookPixelForm } from '@/components/FacebookPixelForm';
import { WebhookForm } from '@/components/WebhookForm';
import { CheckoutCustomizer } from '@/components/checkout/CheckoutCustomizer';
import { OrderBumpConfigurator } from '@/components/OrderBumpConfigurator';
import { UpsellConfigurator } from '@/components/UpsellConfigurator';
import { QuizBuilder } from '@/components/QuizBuilder';

import { IntegrationType } from '@/components/IntegrationTypeSelector';

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface IntegrationConfiguratorProps {
  product: Product;
  integrationType: IntegrationType;
  onBack: () => void;
  onComplete: () => void;
}

export function IntegrationConfigurator({ 
  product, 
  integrationType, 
  onBack, 
  onComplete 
}: IntegrationConfiguratorProps) {
  const handleSuccess = () => {
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Configurar {integrationType.name}
        </h3>
        <p className="text-muted-foreground">
          Produto selecionado: <span className="font-medium">{product.name}</span>
        </p>
      </div>

      {integrationType.id === 'facebook-pixel' && (
        <FacebookPixelForm 
          productId={product.id}
          onSaveSuccess={handleSuccess}
        />
      )}

      {integrationType.id === 'webhook' && (
        <WebhookForm 
          productId={product.id}
          onSaveSuccess={handleSuccess}
        />
      )}

      {integrationType.id === 'order-bump' && (
        <OrderBumpConfigurator 
          productId={product.id}
          onSaveSuccess={handleSuccess}
        />
      )}

      {integrationType.id === 'custom-checkout' && (
        <CheckoutCustomizer 
          productId={product.id}
          onSaveSuccess={handleSuccess}
        />
      )}

      {integrationType.id === 'upsell' && (
        <UpsellConfigurator 
          productId={product.id}
          onSaveSuccess={handleSuccess}
        />
      )}


      {integrationType.id === 'quiz-builder' && (
        <QuizBuilder 
          productId={product.id}
          onSaveSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
