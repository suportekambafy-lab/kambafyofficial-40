import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebhookSettings } from '@/hooks/useWebhookSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Send, CheckCircle, XCircle } from 'lucide-react';

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
  { id: 'subscription.paid', name: 'Assinatura Paga', description: 'Quando uma assinatura é paga/renovada' },
  { id: 'subscription.payment_failed', name: 'Assinatura Expirada', description: 'Quando a assinatura expira sem renovação' },
  { id: 'user.registered', name: 'Usuário Registrado', description: 'Quando um novo usuário se registra' },
  { id: 'product.purchased', name: 'Produto Comprado', description: 'Quando um produto é comprado' },
];

export function WebhookForm({ productId, onSaveSuccess }: WebhookFormProps) {
  const { toast } = useToast();
  const { 
    settings, 
    setSettings, 
    saveSettings, 
    testWebhook,
    testLoading,
    loading 
  } = useWebhookSettings(productId);

  const [selectedTestEvent, setSelectedTestEvent] = useState('subscription.paid');
  const [eventTestLoading, setEventTestLoading] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleTestEvent = async () => {
    if (!productId) {
      toast({
        title: "Erro",
        description: "Selecione um produto primeiro",
        variant: "destructive"
      });
      return;
    }

    if (!settings.url) {
      toast({
        title: "Erro",
        description: "Configure a URL do webhook primeiro",
        variant: "destructive"
      });
      return;
    }

    setEventTestLoading(true);
    setLastTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-webhook-event', {
        body: {
          event_type: selectedTestEvent,
          product_id: productId,
          webhook_url: settings.url,
          webhook_secret: settings.secret
        }
      });

      if (error) throw error;

      if (data.success) {
        setLastTestResult({ 
          success: true, 
          message: `Evento "${selectedTestEvent}" enviado com sucesso! Status: ${data.status}` 
        });
        toast({
          title: "Teste enviado",
          description: `Evento ${selectedTestEvent} enviado com sucesso`,
        });
      } else {
        setLastTestResult({ 
          success: false, 
          message: `Falha ao enviar evento. Status: ${data.status}` 
        });
        toast({
          title: "Falha no teste",
          description: `Status HTTP: ${data.status}`,
          variant: "destructive"
        });
      }

      console.log('Test webhook result:', data);
    } catch (error: any) {
      console.error('Error testing webhook event:', error);
      setLastTestResult({ 
        success: false, 
        message: error.message || "Erro ao enviar teste" 
      });
      toast({
        title: "Erro",
        description: error.message || "Falha ao testar webhook",
        variant: "destructive"
      });
    } finally {
      setEventTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configurar Webhook</h2>
        <p className="text-muted-foreground">
          Selecione eventos personalizados e receba notificações em tempo real para este produto
        </p>
        {productId && (
          <p className="text-xs text-muted-foreground mt-2">
            Este webhook será específico para o produto selecionado
          </p>
        )}
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
              URL onde os eventos serão enviados via POST. Use https://webhook.site para testes.
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

      {/* Test Event Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Testar Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Simule eventos de webhook para testar a integração com seu sistema:
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={selectedTestEvent} onValueChange={setSelectedTestEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleTestEvent}
              disabled={eventTestLoading || !settings.url || !productId}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {eventTestLoading ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>

          {lastTestResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              lastTestResult.success 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400'
            }`}>
              {lastTestResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{lastTestResult.message}</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>subscription.paid</strong> - Simula pagamento de assinatura (dar acesso)</p>
            <p><strong>subscription.payment_failed</strong> - Simula expiração sem renovação (revogar acesso)</p>
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
          {testLoading ? "Testando..." : "Testar Conexão"}
        </Button>
        <Button onClick={handleSave} className="flex-1" size="lg">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}