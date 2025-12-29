import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CurrencyFilterProps {
  activeCurrency: string;
  onCurrencyChange: (currency: string) => void;
  availableCurrencies: string[];
}

const CURRENCY_INFO: Record<string, { symbol: string; flag: string }> = {
  'all': { symbol: '∑', flag: '🌍' },
  'KZ': { symbol: 'Kz', flag: '🇦🇴' },
  'EUR': { symbol: '€', flag: '🇪🇺' },
  'USD': { symbol: '$', flag: '🇺🇸' },
  'MZN': { symbol: 'MT', flag: '🇲🇿' },
  'GBP': { symbol: '£', flag: '🇬🇧' },
  'BRL': { symbol: 'R$', flag: '🇧🇷' },
};

// Normalize AOA to KZ (same currency)
const normalizeCurrency = (currency: string) => currency === 'AOA' ? 'KZ' : currency;

export function CurrencyFilter({ activeCurrency, onCurrencyChange, availableCurrencies }: CurrencyFilterProps) {
  // Normalize currencies and remove duplicates (AOA = KZ)
  const normalizedCurrencies = [...new Set(availableCurrencies.map(normalizeCurrency))];
  const currencies = ['all', ...normalizedCurrencies.filter(c => c !== 'all')];
  
  return (
    <div className="flex gap-2 flex-wrap">
      {currencies.map((currency) => {
        const info = CURRENCY_INFO[currency] || { symbol: currency, flag: '💰' };
        const isActive = activeCurrency === currency;
        
        return (
          <Button
            key={currency}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onCurrencyChange(currency)}
            className={cn(
              "transition-all duration-200",
              isActive && "shadow-md"
            )}
          >
            <span className="mr-1.5">{info.flag}</span>
            {currency === 'all' ? 'Todas' : currency}
          </Button>
        );
      })}
    </div>
  );
}
