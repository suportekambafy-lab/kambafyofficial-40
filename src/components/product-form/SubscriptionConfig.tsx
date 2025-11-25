import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
export interface SubscriptionConfigData {
  is_subscription: boolean;
  renewal_type: 'manual' | 'automatic';
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  trial_days: number;
  grace_period_days: number;
  stripe_price_id?: string; // Gerado automaticamente
  stripe_product_id?: string; // Gerado automaticamente
  allow_reactivation: boolean;
  reactivation_discount_percentage: number;
  // Webhook para integrações (opcional - para vendedores de software)
  webhook_enabled?: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  webhook_events?: string[];
}
interface SubscriptionConfigProps {
  value: SubscriptionConfigData;
  onChange: (config: SubscriptionConfigData) => void;
}
export default function SubscriptionConfig({
  value,
  onChange
}: SubscriptionConfigProps) {
  const handleChange = (field: keyof SubscriptionConfigData, newValue: any) => {
    onChange({
      ...value,
      [field]: newValue
    });
  };
  return <Card>
      <CardHeader>
        <CardTitle>Configuração de Assinatura</CardTitle>
        <CardDescription>
          Configure seu produto como assinatura recorrente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ativar Assinatura */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is_subscription">Produto com Assinatura</Label>
            <p className="text-sm text-muted-foreground">
              Ative para criar um produto de cobrança recorrente
            </p>
          </div>
          <Switch id="is_subscription" checked={value.is_subscription} onCheckedChange={checked => handleChange('is_subscription', checked)} />
        </div>

        {value.is_subscription && <>
            {/* Exemplos Práticos */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-sm mb-2">💡 Exemplos comuns:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• <strong>Netflix:</strong> Mensal (1 mês) + 7 dias teste + renovação automática</li>
                <li>• <strong>Quinzenal:</strong> Semanal (2 semanas) + renovação manual</li>
                <li>• <strong>Trimestral:</strong> Mensal (3 meses) + renovação automática</li>
              </ul>
            </div>

            {/* Tipo de Renovação */}
            <div className="space-y-2">
              <Label htmlFor="renewal_type">Tipo de Renovação</Label>
              <Select value={value.renewal_type} onValueChange={val => handleChange('renewal_type', val)}>
                <SelectTrigger id="renewal_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (Cliente renova manualmente)</SelectItem>
                  <SelectItem value="automatic">Automática (Cobrança recorrente)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {value.renewal_type === 'manual' ? 'Cliente recebe lembretes e precisa renovar manualmente' : 'Cobrança automática no cartão do cliente'}
              </p>
            </div>

            {/* Intervalo de Cobrança */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Intervalo de Cobrança</Label>
                <Select value={value.interval} onValueChange={val => handleChange('interval', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Diário</SelectItem>
                    <SelectItem value="week">Semanal</SelectItem>
                    <SelectItem value="month">Mensal</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>A cada quantos(as)?</Label>
                <Input type="number" min="1" max="12" value={value.interval_count} onChange={e => handleChange('interval_count', parseInt(e.target.value) || 1)} />
                <p className="text-xs text-muted-foreground">
                  Ex: "2" semanas = quinzenal
                </p>
              </div>
            </div>

            {/* Período de Teste Grátis */}
            <div className="space-y-2">
              <Label htmlFor="trial_days">Período de Teste Grátis (dias)</Label>
              <Input id="trial_days" type="number" min="0" max="90" value={value.trial_days} onChange={e => handleChange('trial_days', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">
                {value.trial_days === 0 ? '⚠️ Sem período de teste - cliente pagará imediatamente' : `✅ Cliente terá ${value.trial_days} dias grátis antes da primeira cobrança`}
              </p>
            </div>

            {/* Período de Graça */}
            <div className="space-y-2">
              <Label htmlFor="grace_period_days">Período de Graça (dias)</Label>
              <Input id="grace_period_days" type="number" min="0" max="30" value={value.grace_period_days} onChange={e => handleChange('grace_period_days', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">
                Quantos dias o cliente pode acessar após vencimento antes do cancelamento
              </p>
            </div>

            {/* Aviso de Integração Automática */}
            

            {/* Configurações de Reativação */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Reativação</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente pode reativar assinatura cancelada
                  </p>
                </div>
                <Switch checked={value.allow_reactivation} onCheckedChange={checked => handleChange('allow_reactivation', checked)} />
              </div>
              
              {value.allow_reactivation && <div className="space-y-2">
                  <Label>Desconto na Reativação (%)</Label>
                  <Input type="number" min="0" max="100" value={value.reactivation_discount_percentage} onChange={e => handleChange('reactivation_discount_percentage', parseInt(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground">
                    Ex: 20 = 20% de desconto no primeiro mês ao reativar
                  </p>
                </div>}
            </div>

            {/* Resumo da Configuração */}
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> Resumo da Configuração
              </h4>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li>
                  <strong>Renovação:</strong> {value.renewal_type === 'manual' ? '🔄 Manual' : '⚡ Automática'}
                </li>
                
                <li>
                  <strong>Frequência:</strong> A cada {value.interval_count}{' '}
                  {value.interval === 'day' ? 'dia(s)' : value.interval === 'week' ? 'semana(s)' : value.interval === 'month' ? 'mês(es)' : 'ano(s)'}
                </li>
                
                {value.trial_days > 0 && <li className="text-green-600 dark:text-green-400">
                    <strong>Teste Grátis:</strong> ✨ {value.trial_days} dias
                  </li>}
                
                <li>
                  <strong>Período de Graça:</strong> {value.grace_period_days} dias após vencimento
                </li>
                
                {value.stripe_price_id && <li className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    Stripe: {value.stripe_price_id}
                  </li>}
                
                {value.allow_reactivation && <li>
                    <strong>Reativação:</strong> ✅ Permitida
                    {value.reactivation_discount_percentage > 0 && ` (${value.reactivation_discount_percentage}% desconto)`}
                  </li>}
              </ul>
            </div>

            {/* Webhook para Integração com Software Externo */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="webhook_enabled">Integração com Software Externo</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure webhooks para receber notificações automáticas de pagamento (opcional)
                  </p>
                </div>
                <Switch
                  id="webhook_enabled"
                  checked={value.webhook_enabled || false}
                  onCheckedChange={(checked) => handleChange('webhook_enabled', checked)}
                />
              </div>

              {value.webhook_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">URL do Webhook</Label>
                    <Input
                      id="webhook_url"
                      placeholder="https://seuapp.com/api/kambafy/webhook"
                      value={value.webhook_url || ''}
                      onChange={(e) => handleChange('webhook_url', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL onde seu software receberá as notificações
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhook_secret">Secret (Opcional)</Label>
                    <Input
                      id="webhook_secret"
                      type="password"
                      placeholder="Digite um secret para validação HMAC"
                      value={value.webhook_secret || ''}
                      onChange={(e) => handleChange('webhook_secret', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use para validar a autenticidade dos webhooks
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Eventos para Notificar</Label>
                    <div className="space-y-2">
                      {[
                        { id: 'subscription.created', label: '✨ Nova assinatura criada' },
                        { id: 'subscription.renewed', label: '🔄 Assinatura renovada' },
                        { id: 'subscription.cancelled', label: '❌ Assinatura cancelada' },
                        { id: 'payment.success', label: '✅ Pagamento aprovado' },
                        { id: 'payment.failed', label: '⚠️ Pagamento falhou' },
                      ].map((event) => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={event.id}
                            checked={(value.webhook_events || []).includes(event.id)}
                            onCheckedChange={(checked) => {
                              const currentEvents = value.webhook_events || [];
                              const newEvents = checked
                                ? [...currentEvents, event.id]
                                : currentEvents.filter((e) => e !== event.id);
                              handleChange('webhook_events', newEvents);
                            }}
                          />
                          <Label htmlFor={event.id} className="text-sm font-normal cursor-pointer">
                            {event.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione quais eventos devem acionar o webhook
                    </p>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Exemplo de payload:</strong> Seu software receberá um POST com dados do
                      cliente, status da assinatura e informações de pagamento.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>}
      </CardContent>
    </Card>;
}