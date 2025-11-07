import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SubscriptionConfigData {
  is_subscription: boolean;
  renewal_type: 'manual' | 'automatic';
  billing_cycle: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  grace_period_days: number;
}

interface SubscriptionConfigProps {
  value: SubscriptionConfigData;
  onChange: (config: SubscriptionConfigData) => void;
}

export default function SubscriptionConfig({ value, onChange }: SubscriptionConfigProps) {
  const handleChange = (field: keyof SubscriptionConfigData, newValue: any) => {
    onChange({ ...value, [field]: newValue });
  };

  return (
    <Card>
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
          <Switch
            id="is_subscription"
            checked={value.is_subscription}
            onCheckedChange={(checked) => handleChange('is_subscription', checked)}
          />
        </div>

        {value.is_subscription && (
          <>
            {/* Tipo de Renovação */}
            <div className="space-y-2">
              <Label htmlFor="renewal_type">Tipo de Renovação</Label>
              <Select
                value={value.renewal_type}
                onValueChange={(val) => handleChange('renewal_type', val)}
              >
                <SelectTrigger id="renewal_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (Cliente renova manualmente)</SelectItem>
                  <SelectItem value="automatic">Automática (Cobrança recorrente)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {value.renewal_type === 'manual' 
                  ? 'Cliente recebe lembretes e precisa renovar manualmente'
                  : 'Cobrança automática no cartão do cliente'}
              </p>
            </div>

            {/* Ciclo de Cobrança */}
            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
              <Select
                value={value.billing_cycle}
                onValueChange={(val) => handleChange('billing_cycle', val)}
              >
                <SelectTrigger id="billing_cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral (3 meses)</SelectItem>
                  <SelectItem value="semiannual">Semestral (6 meses)</SelectItem>
                  <SelectItem value="annual">Anual (12 meses)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período de Graça */}
            <div className="space-y-2">
              <Label htmlFor="grace_period_days">Período de Graça (dias)</Label>
              <Input
                id="grace_period_days"
                type="number"
                min="0"
                max="30"
                value={value.grace_period_days}
                onChange={(e) => handleChange('grace_period_days', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Quantos dias o cliente pode acessar após vencimento antes do cancelamento
              </p>
            </div>

            {/* Resumo da Configuração */}
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Resumo</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Renovação: <span className="font-medium text-foreground">
                  {value.renewal_type === 'manual' ? 'Manual' : 'Automática'}
                </span></li>
                <li>• Ciclo: <span className="font-medium text-foreground">
                  {value.billing_cycle === 'monthly' ? 'Mensal' :
                   value.billing_cycle === 'quarterly' ? 'Trimestral' :
                   value.billing_cycle === 'semiannual' ? 'Semestral' : 'Anual'}
                </span></li>
                <li>• Período de Graça: <span className="font-medium text-foreground">
                  {value.grace_period_days} dias
                </span></li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
