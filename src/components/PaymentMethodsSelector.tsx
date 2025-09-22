import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { PaymentMethod, getAllPaymentMethods } from '../utils/paymentMethods';
import { PaymentMethodIcon } from './PaymentMethodIcon';
import { CreditCard } from 'lucide-react';

interface PaymentMethodsSelectorProps {
  selectedMethods: PaymentMethod[];
  onMethodsChange: (methods: PaymentMethod[]) => void;
}

export default function PaymentMethodsSelector({ selectedMethods, onMethodsChange }: PaymentMethodsSelectorProps) {
  const allMethods = getAllPaymentMethods();
  const currentMethods = selectedMethods.length > 0 ? selectedMethods : allMethods;

  const handleMethodToggle = (methodId: string, enabled: boolean) => {
    // Verificar se o método está disponível no PAYMENT_METHODS
    const globalMethod = allMethods.find(m => m.id === methodId);
    if (globalMethod?.enabled === false) {
      // Se o método está marcado como indisponível globalmente, não permitir alteração
      return;
    }
    
    const updatedMethods = currentMethods.map(method =>
      method.id === methodId ? { ...method, enabled } : method
    );
    onMethodsChange(updatedMethods);
  };

  // Agrupar métodos por país
  const methodsByCountry = currentMethods.reduce((acc, method) => {
    const country = method.countryName || 'Outros';
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(method);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5" />
          Métodos de Pagamento Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métodos agrupados por país */}
        {Object.entries(methodsByCountry).map(([country, methods]) => (
          <div key={country} className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <h4 className="font-medium text-sm text-gray-700">{country}</h4>
              <Badge variant="outline" className="text-xs">
                {methods.length} método{methods.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {methods.map((method) => (
                 <div key={method.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                   // Verificar se o método está habilitado no PAYMENT_METHODS (não apenas no formData)
                   allMethods.find(m => m.id === method.id)?.enabled === false 
                     ? 'bg-gray-50 opacity-60' 
                     : 'hover:bg-gray-50'
                 }`}>
                   <div className="flex items-center gap-3">
                     <Checkbox
                       id={method.id}
                       checked={method.enabled && allMethods.find(m => m.id === method.id)?.enabled !== false}
                       onCheckedChange={(checked) => handleMethodToggle(method.id, checked as boolean)}
                       disabled={allMethods.find(m => m.id === method.id)?.enabled === false}
                     />
                     <div className="flex items-center gap-3">
                       <PaymentMethodIcon
                         methodId={method.id}
                         width={32}
                         height={32}
                         className="rounded border"
                       />
                       <div className="flex flex-col">
                         <span className="font-medium text-sm">{method.name}</span>
                         <span className="text-xs text-gray-500">{method.countryFlag} {method.countryName}</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Mostrar status baseado no PAYMENT_METHODS, não no formData */}
                   {allMethods.find(m => m.id === method.id)?.enabled === false ? (
                     <Badge variant="destructive" className="text-xs bg-red-100 text-red-800">
                       Indisponível
                     </Badge>
                   ) : method.enabled ? (
                     <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                       Ativo
                     </Badge>
                   ) : null}
                 </div>
              ))}
            </div>
          </div>
        ))}

        {/* Resumo dos métodos ativos */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-3">Métodos ativos no checkout:</p>
          <div className="flex flex-wrap gap-2">
            {currentMethods.filter(m => m.enabled && allMethods.find(am => am.id === m.id)?.enabled !== false).length === 0 ? (
              <Badge variant="destructive" className="text-xs">
                Nenhum método ativo - Selecione pelo menos um método
              </Badge>
            ) : (
              currentMethods
                .filter(method => method.enabled && allMethods.find(am => am.id === method.id)?.enabled !== false)
                .map(method => (
                  <Badge key={method.id} variant="default" className="text-xs flex items-center gap-1">
                    <span>{method.countryFlag}</span>
                    {method.name}
                  </Badge>
                ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}