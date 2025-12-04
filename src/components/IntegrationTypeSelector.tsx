
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Facebook, Webhook, Settings, Palette, Plus, HelpCircle, Mail, Construction } from 'lucide-react';

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
    name: 'Facebook Pixel',
    description: 'Configure Pixel ID e API de Conversões em um só lugar',
    icon: ({ className }: { className?: string }) => <Facebook className={className} />,
    color: 'text-blue-600'
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Selecione eventos personalizados e receba notificações em tempo real',
    icon: ({ className }: { className?: string }) => <Webhook className={className} />,
    color: 'text-orange-600'
  },
  {
    id: 'order-bump',
    name: 'Order Bump',
    description: 'Configure produtos complementares para aumentar o valor médio do pedido',
    icon: ({ className }: { className?: string }) => <Plus className={className} />,
    color: 'text-purple-600'
  },
  {
    id: 'custom-checkout',
    name: 'Checkout Personalizado',
    description: 'Personalize seu checkout com banners, countdown, avaliações e prova social',
    icon: ({ className }: { className?: string }) => <Palette className={className} />,
    color: 'text-green-600'
  },
  {
    id: 'upsell',
    name: 'Upsell Pós-Compra',
    description: 'Configure ofertas especiais que aparecem após a compra principal',
    icon: ({ className }: { className?: string }) => <Settings className={className} />,
    color: 'text-indigo-600'
  }
];

const comingSoonTypes: IntegrationType[] = [
  {
    id: 'quiz-builder',
    name: 'Quiz Builder',
    description: 'Em breve - Crie páginas de quiz interativas para qualificar leads',
    icon: ({ className }: { className?: string }) => <Construction className={className} />,
    color: 'text-gray-500'
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

      {/* Available Integrations */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrationTypes.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedType?.id === type.id
                ? 'ring-2 ring-primary border-primary'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onTypeSelect(type)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`${type.color}`}>
                  {type.icon({ className: "w-8 h-8" })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{type.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-muted-foreground">
                      Disponível
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Section */}
      {comingSoonTypes.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">Em Breve</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoonTypes.map((type) => (
              <Card
                key={type.id}
                className="opacity-75 cursor-not-allowed border-dashed"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`${type.color}`}>
                      {type.icon({ className: "w-8 h-8" })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{type.name}</h3>
                        <Badge variant="secondary" className="text-xs">Em Breve</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {type.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-xs text-muted-foreground">
                          Em desenvolvimento
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
