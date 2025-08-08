
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { getAllPaymentMethods, PaymentMethod } from "@/utils/paymentMethods";

interface PaymentMethodsSelectorProps {
  selectedMethods: PaymentMethod[];
  onMethodsChange: (methods: PaymentMethod[]) => void;
}

export default function PaymentMethodsSelector({ selectedMethods, onMethodsChange }: PaymentMethodsSelectorProps) {
  const allMethods = getAllPaymentMethods();
  const currentMethods = selectedMethods.length > 0 ? selectedMethods : allMethods;

  const handleMethodToggle = (methodId: string, enabled: boolean) => {
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
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={method.id}
                      checked={method.enabled}
                      onCheckedChange={(checked) => handleMethodToggle(method.id, checked as boolean)}
                    />
                    <div className="flex items-center gap-3">
                      {method.image && (
                        <img
                          src={method.image}
                          alt={method.name}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <div>
                        <Label htmlFor={method.id} className="font-medium cursor-pointer text-sm">
                          {method.name}
                        </Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs">{method.countryFlag}</span>
                          <span className="text-xs text-gray-500">{method.countryName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {method.enabled && (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      Ativo
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Resumo dos métodos ativos */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-3">Métodos ativos no checkout:</p>
          <div className="flex flex-wrap gap-2">
            {currentMethods.filter(m => m.enabled).length === 0 ? (
              <Badge variant="destructive" className="text-xs">
                Nenhum método ativo - Selecione pelo menos um método
              </Badge>
            ) : (
              currentMethods
                .filter(method => method.enabled)
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
