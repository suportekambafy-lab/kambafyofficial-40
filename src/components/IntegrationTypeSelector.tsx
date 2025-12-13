import React from 'react';
import { Card } from '@/components/ui/card';
import { Webhook, Palette, Plus, Settings, Ticket } from 'lucide-react';
import utmifyLogo from '@/assets/utmify-logo.png';
import googleAnalyticsLogo from '@/assets/google-analytics-logo.png';
import googleAdsLogo from '@/assets/google-ads-logo.png';
import metaLogo from '@/assets/meta-logo.png';


export interface IntegrationType {
  id: string;
  name: string;
  description: string;
  icon: ({ className }: { className?: string }) => React.ReactNode;
  color: string;
}

interface IntegrationTypeSelectorProps {
  selectedType: IntegrationType | null;
  onTypeSelect: (type: IntegrationType) => void;
}

const trackingIntegrations: IntegrationType[] = [
  {
    id: 'facebook-pixel',
    name: 'Facebook + Instagram',
    description: 'Configure Pixel ID e API de Conversões',
    icon: () => (
      <img src={metaLogo} alt="Meta" className="h-12 w-auto object-contain" />
    ),
    color: ''
  },
  {
    id: 'tiktok-pixel',
    name: 'TikTok',
    description: 'Rastreie conversões do TikTok Ads',
    icon: () => (
      <svg viewBox="0 0 48 48" className="h-8 w-auto">
        <path d="M38.39,13.09a9.77,9.77,0,0,1-5.71-5.75,9.61,9.61,0,0,1-.52-3.14H25.7V31.27a5.83,5.83,0,1,1-4-5.52V19.21a12.29,12.29,0,1,0,10.48,12.18c0-.27,0-.54,0-.81V19.94a16.1,16.1,0,0,0,9.42,3V16.56A9.85,9.85,0,0,1,38.39,13.09Z" fill="#000"/>
        <path d="M36.39,11.09a9.77,9.77,0,0,1-5.71-5.75,9.61,9.61,0,0,1-.52-3.14H23.7V29.27a5.83,5.83,0,1,1-4-5.52V17.21a12.29,12.29,0,1,0,10.48,12.18c0-.27,0-.54,0-.81V17.94a16.1,16.1,0,0,0,9.42,3V14.56A9.85,9.85,0,0,1,36.39,11.09Z" fill="#25F4EE"/>
        <path d="M37.39,12.09a9.77,9.77,0,0,1-5.71-5.75,9.61,9.61,0,0,1-.52-3.14H24.7V30.27a5.83,5.83,0,1,1-4-5.52V18.21a12.29,12.29,0,1,0,10.48,12.18c0-.27,0-.54,0-.81V18.94a16.1,16.1,0,0,0,9.42,3V15.56A9.85,9.85,0,0,1,37.39,12.09Z" fill="#FE2C55"/>
      </svg>
    ),
    color: ''
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics 4',
    description: 'Rastreie visitas e conversões',
    icon: () => (
      <img src={googleAnalyticsLogo} alt="Google Analytics" className="h-8 w-auto object-contain" />
    ),
    color: ''
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Rastreie conversões do Google Ads',
    icon: () => (
      <img src={googleAdsLogo} alt="Google Ads" className="h-8 w-auto object-contain" />
    ),
    color: ''
  },
  {
    id: 'utmify',
    name: 'UTMify',
    description: 'Atribuição de vendas',
    icon: () => <img src={utmifyLogo} alt="UTMify" className="h-8 w-auto object-contain" />,
    color: ''
  }
];

const salesIntegrations: IntegrationType[] = [
  {
    id: 'discount-coupons',
    name: 'Cupons de Desconto',
    description: 'Crie códigos promocionais',
    icon: ({ className }: { className?: string }) => <Ticket className={className} />,
    color: 'text-emerald-600'
  },
  {
    id: 'order-bump',
    name: 'Order Bump',
    description: 'Produtos complementares',
    icon: ({ className }: { className?: string }) => <Plus className={className} />,
    color: 'text-purple-600'
  },
  {
    id: 'custom-checkout',
    name: 'Checkout Personalizado',
    description: 'Personalize seu checkout',
    icon: ({ className }: { className?: string }) => <Palette className={className} />,
    color: 'text-green-600'
  },
  {
    id: 'upsell',
    name: 'Upsell Pós-Compra',
    description: 'Ofertas após a compra',
    icon: ({ className }: { className?: string }) => <Settings className={className} />,
    color: 'text-indigo-600'
  }
];

const automationIntegrations: IntegrationType[] = [
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Receba notificações em tempo real',
    icon: ({ className }: { className?: string }) => <Webhook className={className} />,
    color: 'text-orange-600'
  }
];

// Export all integrations for other components
export const integrationTypes: IntegrationType[] = [
  ...trackingIntegrations,
  ...salesIntegrations,
  ...automationIntegrations
];

interface CategorySectionProps {
  title: string;
  description: string;
  integrations: IntegrationType[];
  selectedType: IntegrationType | null;
  onTypeSelect: (type: IntegrationType) => void;
}

function CategorySection({ title, description, integrations, selectedType, onTypeSelect }: CategorySectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {integrations.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all hover:shadow-md p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] ${
              selectedType?.id === type.id
                ? 'ring-2 ring-primary bg-primary/5 border-primary'
                : 'border-border hover:border-primary/50 bg-card'
            }`}
            onClick={() => onTypeSelect(type)}
          >
            <div className={type.color}>
              {type.icon({ className: "w-8 h-8" })}
            </div>
            <span className="text-sm font-medium text-center">{type.name}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function IntegrationTypeSelector({ selectedType, onTypeSelect }: IntegrationTypeSelectorProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Escolha o Tipo de Integração</h2>
        <p className="text-muted-foreground">
          Selecione o tipo de integração que você deseja configurar
        </p>
      </div>

      <div className="space-y-6">
        <CategorySection
          title="Rastreamento & Conversões"
          description="Pixels, analytics e atribuição de vendas"
          integrations={trackingIntegrations}
          selectedType={selectedType}
          onTypeSelect={onTypeSelect}
        />

        <CategorySection
          title="Vendas & Checkout"
          description="Aumente suas vendas com ofertas e personalização"
          integrations={salesIntegrations}
          selectedType={selectedType}
          onTypeSelect={onTypeSelect}
        />

        <CategorySection
          title="Automação"
          description="Conecte com sistemas externos"
          integrations={automationIntegrations}
          selectedType={selectedType}
          onTypeSelect={onTypeSelect}
        />
      </div>
    </div>
  );
}
