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

const allCountries = [
  { code: 'AO', name: 'Angola', currency: 'KZ', flag: '🇦🇴' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
  { code: 'MZ', name: 'Moçambique', currency: 'MZN', flag: '🇲🇿' }
];

// Filtrar Angola (moeda base) das opções de preços personalizados
const countries = allCountries.filter(country => country.code !== 'AO');

export default function CountryPriceConfig({ 
  basePrice = "", 
  customPrices = {}, 
  onCustomPricesChange 
}: CountryPriceConfigProps) {
  console.log('🚨 CountryPriceConfig carregado - basePrice:', basePrice, 'customPrices:', Object.keys(customPrices));
  
  const [enableCustomPricing, setEnableCustomPricing] = useState(
    Object.keys(customPrices || {}).length > 0
  );
  const [prices, setPrices] = useState(customPrices || {});

  // Sync enableCustomPricing when customPrices prop changes
  useEffect(() => {
    const shouldEnable = Object.keys(customPrices || {}).length > 0;
    console.log('🔄 Syncing enableCustomPricing:', shouldEnable, 'customPrices:', customPrices);
    setEnableCustomPricing(shouldEnable);
  }, [customPrices]);

  // Sync local prices when customPrices prop changes
  useEffect(() => {
    console.log('🔄 Syncing customPrices to local state:', customPrices);
    setPrices(customPrices || {});
  }, [customPrices]);

  useEffect(() => {
    console.log('🔄 CountryPriceConfig useEffect - enableCustomPricing:', enableCustomPricing);
    if (!enableCustomPricing) {
      console.log('🔄 Limpando preços personalizados');
      setPrices({});
      onCustomPricesChange({});
    }
  }, [enableCustomPricing]); // Removido onCustomPricesChange da dependência

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

  // SEMPRE RENDERIZAR O COMPONENTE
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>💰 Preços por País</CardTitle>
        <CardDescription>
          Configure preços específicos para cada país ou use a conversão automática
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="enable-custom-pricing"
            checked={enableCustomPricing}
            onCheckedChange={(checked) => {
              console.log('🔄 Switch mudou para:', checked);
              setEnableCustomPricing(checked);
            }}
          />
          <Label htmlFor="enable-custom-pricing" className="text-sm font-medium">
            Ativar preços personalizados por país
          </Label>
        </div>

        {enableCustomPricing ? (
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
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground mb-2">
              Conversão automática baseada no preço base ({basePrice || 0} KZ):
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