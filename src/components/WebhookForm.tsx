
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useWebhookSettings } from '@/hooks/useWebhookSettings';

interface WebhookFormProps {
  productId?: string;
  onSaveSuccess: () => void;
}

const availableEvents = [
  { id: 'order.created', name: 'Pedido Criado', description: 'Quando um novo pedido é criado' },
  { id: 'order.completed', name: 'Pedido Finalizado', description: 'Quando um pedido é finalizado' },
  { id: 'order.cancelled', name: 'Pedido Cancelado', description: 'Quando um pedido é cancelado' },
  { id: 'payment.success', name: 'Pagamento Aprovado', description: 'Quando um pagamento é aprovado' },
  { id: 'payment.failed', name: 'Pagamento Falhou', description: 'Quando um pagamento falha' },
  { id: 'user.registered', name: 'Usuário Registrado', description: 'Quando um novo usuário se registra' },
  { id: 'product.purchased', name: 'Produto Comprado', description: 'Quando um produto é comprado' },
];

export function WebhookForm({ productId, onSaveSuccess }: WebhookFormProps) {
  const { 
    settings, 
    setSettings, 
    saveSettings, 
    testWebhook,
    testLoading,
    loading 
  } = useWebhookSettings();

  const handleEventChange = (eventId: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      events: checked 
        ? [...prev.events, eventId]
        : prev.events.filter(id => id !== eventId)
    }));
  };

  const handleSave = async () => {
    const success = await saveSettings({
      ...settings,
      product_id: productId
    });
    if (success) {
      onSaveSuccess();
    }
  };

  const handleTest = async () => {
    if (!settings.url) {
      return;
    }
    await testWebhook();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configurar Webhook</h2>
        <p className="text-muted-foreground">
          Selecione eventos personalizados e receba notificações em tempo real
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={settings.active}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Ativar Webhook</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Webhook</Label>
            <Input
              id="url"
              placeholder="https://exemplo.com/webhook"
              value={settings.url}
              onChange={(e) => setSettings(prev => ({ ...prev, url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              URL onde os eventos serão enviados via POST
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret">Secret (opcional)</Label>
            <Input
              id="secret"
              type="password"
              placeholder="Digite o secret para validação"
              value={settings.secret}
              onChange={(e) => setSettings(prev => ({ ...prev, secret: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Usado para validar a autenticidade dos webhooks
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos Personalizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Selecione quais eventos você deseja receber notificações:
          </p>
          
          <div className="grid gap-3">
            {availableEvents.map((event) => (
              <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={event.id}
                  checked={settings.events.includes(event.id)}
                  onCheckedChange={(checked) => handleEventChange(event.id, checked as boolean)}
                  disabled={!settings.active}
                />
                <div className="flex-1">
                  <Label htmlFor={event.id} className="text-sm font-medium">
                    {event.name}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {settings.events.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Eventos selecionados: {settings.events.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.events.map(id => availableEvents.find(e => e.id === id)?.name).join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          onClick={handleTest} 
          variant="outline" 
          className="flex-1"
          disabled={testLoading || !settings.url || !settings.active}
        >
          {testLoading ? "Testando..." : "Testar Webhook"}
        </Button>
        <Button onClick={handleSave} className="flex-1" size="lg">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
