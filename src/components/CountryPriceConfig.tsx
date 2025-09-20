import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CountryPriceConfigProps {
  basePrice: string;
  customPrices: Record<string, string>;
  onCustomPricesChange: (prices: Record<string, string>) => void;
}

const countries = [
  { code: 'AO', name: 'Angola', currency: 'KZ', flag: '🇦🇴' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
  { code: 'MZ', name: 'Moçambique', currency: 'MZN', flag: '🇲🇿' }
];

export const CountryPriceConfig: React.FC<CountryPriceConfigProps> = ({
  basePrice = "",
  customPrices = {},
  onCustomPricesChange
}) => {
  console.log('🎯 CountryPriceConfig rendered', { basePrice, customPrices });
  console.log('🔍 EnableCustomPricing inicial:', Object.keys(customPrices || {}).length > 0);
  
  const [enableCustomPricing, setEnableCustomPricing] = useState(
    Object.keys(customPrices || {}).length > 0
  );
  const [prices, setPrices] = useState(customPrices || {});

  useEffect(() => {
    if (!enableCustomPricing) {
      setPrices({});
      onCustomPricesChange({});
    }
  }, [enableCustomPricing, onCustomPricesChange]);

  const handlePriceChange = (countryCode: string, value: string) => {
    console.log('💰 Alterando preço:', { countryCode, value });
    const newPrices = { ...prices, [countryCode]: value };
    console.log('📝 Preços atualizados localmente:', newPrices);
    setPrices(newPrices);
    onCustomPricesChange(newPrices);
    console.log('✅ onCustomPricesChange chamado com:', newPrices);
  };

  const resetToAutomatic = () => {
    setEnableCustomPricing(false);
    setPrices({});
    onCustomPricesChange({});
  };

  const getExchangeRates = () => {
    const basePriceNumber = parseFloat(basePrice) || 0;
    return {
      'AO': basePriceNumber, // Base é KZ
      'PT': (basePriceNumber * 0.00095).toFixed(2), // KZ para EUR
      'MZ': (basePriceNumber * 0.0722).toFixed(2) // KZ para MZN
    };
  };

  const automaticPrices = getExchangeRates();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preços por País</CardTitle>
        <CardDescription>
          Configure preços específicos para cada país ou use a conversão automática
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="custom-pricing"
            checked={enableCustomPricing}
            onCheckedChange={setEnableCustomPricing}
          />
          <Label htmlFor="custom-pricing">
            Ativar preços personalizados por país
          </Label>
        </div>

        {enableCustomPricing && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={resetToAutomatic}>
                Voltar à conversão automática
              </Button>
            </div>
            
            <div className="grid gap-4">
              {countries.map((country) => (
                <div key={country.code} className="grid grid-cols-4 items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{country.flag}</span>
                    <span className="font-medium">{country.name}</span>
                  </div>
                  
                  <div className="col-span-3">
                    <Label htmlFor={`price-${country.code}`}>
                      Preço em {country.currency}
                    </Label>
                    <Input
                      id={`price-${country.code}`}
                      type="number"
                      step="0.01"
                      placeholder={`Ex: ${automaticPrices[country.code]}`}
                      value={prices[country.code] || ''}
                      onChange={(e) => handlePriceChange(country.code, e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Conversão automática: {automaticPrices[country.code]} {country.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!enableCustomPricing && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground mb-2">
              Conversão automática baseada no preço base ({basePrice} KZ):
            </p>
            {countries.map((country) => (
              <div key={country.code} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="font-medium">{country.name}</span>
                </div>
                <span className="font-mono text-sm">
                  {automaticPrices[country.code]} {country.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CountryPriceConfig;