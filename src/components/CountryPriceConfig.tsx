import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CountryPriceConfigProps {
  basePrice: string;
  baseCurrency?: string; // Moeda base do vendedor (padrão: KZ)
  customPrices: Record<string, string>;
  onCustomPricesChange: (prices: Record<string, string>) => void;
}

const allCountries = [
  { code: 'AO', name: 'Angola', currency: 'KZ', flag: '🇦🇴' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
  { code: 'MZ', name: 'Moçambique', currency: 'MZN', flag: '🇲🇿' },
  { code: 'GB', name: 'Reino Unido', currency: 'GBP', flag: '🇬🇧' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD', flag: '🇺🇸' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', flag: '🇧🇷' },
];

// Taxas de conversão entre moedas
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  'KZ': { EUR: 0.00095, MZN: 0.0722, GBP: 0.0008, USD: 0.0011, BRL: 0.0056, KZ: 1 },
  'EUR': { KZ: 1053, MZN: 76, GBP: 0.84, USD: 1.08, BRL: 5.9, EUR: 1 },
  'MZN': { KZ: 13.8, EUR: 0.013, GBP: 0.011, USD: 0.014, BRL: 0.078, MZN: 1 },
  'GBP': { KZ: 1250, EUR: 1.19, MZN: 91, USD: 1.27, BRL: 7.0, GBP: 1 },
  'USD': { KZ: 985, EUR: 0.93, MZN: 71, GBP: 0.79, BRL: 5.5, USD: 1 },
  'BRL': { KZ: 179, EUR: 0.17, MZN: 12.8, GBP: 0.14, USD: 0.18, BRL: 1 },
};

// Mapeamento de moeda para símbolo
const CURRENCY_SYMBOLS: Record<string, string> = {
  'KZ': 'KZ',
  'EUR': '€',
  'MZN': 'MT',
  'GBP': '£',
  'USD': '$',
  'BRL': 'R$',
};

export default function CountryPriceConfig({ 
  basePrice = "", 
  baseCurrency = "KZ",
  customPrices = {}, 
  onCustomPricesChange 
}: CountryPriceConfigProps) {
  // Filtrar países excluindo o país base do vendedor
  const countries = allCountries.filter(c => c.currency !== baseCurrency);
  
  const [enableCustomPricing, setEnableCustomPricing] = useState(
    Object.keys(customPrices || {}).length > 0
  );
  const [prices, setPrices] = useState(customPrices || {});

  // Sync enableCustomPricing when customPrices prop changes
  useEffect(() => {
    const shouldEnable = Object.keys(customPrices || {}).length > 0;
    setEnableCustomPricing(shouldEnable);
  }, [customPrices]);

  // Sync local prices when customPrices prop changes
  useEffect(() => {
    setPrices(customPrices || {});
  }, [customPrices]);

  useEffect(() => {
    if (!enableCustomPricing) {
      setPrices({});
      onCustomPricesChange({});
    }
  }, [enableCustomPricing]);

  const handlePriceChange = (countryCode: string, value: string) => {
    const newPrices = { ...prices, [countryCode]: value };
    setPrices(newPrices);
    onCustomPricesChange(newPrices);
  };

  const resetToAutomatic = () => {
    setEnableCustomPricing(false);
    setPrices({});
    onCustomPricesChange({});
  };

  const getExchangeRates = () => {
    const base = parseFloat(basePrice) || 0;
    const rates = EXCHANGE_RATES[baseCurrency] || EXCHANGE_RATES['KZ'];
    
    const result: Record<string, string> = {};
    countries.forEach(country => {
      const rate = rates[country.currency] || 1;
      const converted = base * rate;
      // Usar 0 casas decimais para valores grandes, 2 para pequenos
      result[country.code] = converted > 100 ? converted.toFixed(0) : converted.toFixed(2);
    });
    
    return result;
  };

  const automaticPrices = getExchangeRates();
  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency] || baseCurrency;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Preços por País</CardTitle>
        <CardDescription>
          Preço base em {baseSymbol}. Configure preços específicos para cada país ou use a conversão automática.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="enable-custom-pricing"
            checked={enableCustomPricing}
            onCheckedChange={setEnableCustomPricing}
          />
          <Label htmlFor="enable-custom-pricing" className="text-sm font-medium">
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
                <div key={country.code} className="flex flex-col md:grid md:grid-cols-4 items-start md:items-center gap-2 md:gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{country.flag}</span>
                    <span className="font-medium">{country.name}</span>
                  </div>
                  
                  <div className="w-full md:col-span-3">
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
      </CardContent>
    </Card>
  );
}
