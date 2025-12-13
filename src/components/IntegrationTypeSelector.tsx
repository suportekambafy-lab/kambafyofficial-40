import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Facebook, Webhook, Settings, Palette, Plus, Construction } from 'lucide-react';
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

const integrationTypes: IntegrationType[] = [
  {
    id: 'facebook-pixel',
    name: 'Facebook + Instagram',
    description: 'Configure Pixel ID e API de Conversões',
    icon: ({ className }: { className?: string }) => (
      <img src={metaLogo} alt="Meta" className="h-12 w-auto object-contain" />
    ),
    color: ''
  },
  {
    id: 'tiktok-pixel',
    name: 'TikTok',
    description: 'Rastreie conversões do TikTok Ads',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    color: 'text-black'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics 4',
    description: 'Rastreie visitas e conversões',
    icon: ({ className }: { className?: string }) => (
      <img src={googleAnalyticsLogo} alt="Google Analytics" className="h-8 w-auto object-contain" />
    ),
    color: ''
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Rastreie conversões do Google Ads',
    icon: ({ className }: { className?: string }) => (
      <img src={googleAdsLogo} alt="Google Ads" className="h-8 w-auto object-contain" />
    ),
    color: ''
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Receba notificações em tempo real',
    icon: ({ className }: { className?: string }) => <Webhook className={className} />,
    color: 'text-orange-600'
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
  },
  {
    id: 'utmify',
    name: 'UTMify',
    description: 'Atribuição de vendas',
    icon: ({ className }: { className?: string }) => <img src={utmifyLogo} alt="UTMify" className="h-8 w-auto object-contain" />,
    color: ''
  }
];

export function IntegrationTypeSelector({ selectedType, onTypeSelect }: IntegrationTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Escolha o Tipo de Integração</h2>
        <p className="text-muted-foreground">
          Selecione o tipo de integração que você deseja configurar
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {integrationTypes.map((type) => (
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
