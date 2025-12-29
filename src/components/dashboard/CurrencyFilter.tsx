import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencyFilterProps {
  value: string;
  onValueChange: (currency: string) => void;
}

const CURRENCIES = [
  { code: 'all', label: 'Todas', flag: '🌍' },
  { code: 'KZ', label: 'KZ (Angola)', flag: '🇦🇴' },
  { code: 'MZN', label: 'MZN (Moçambique)', flag: '🇲🇿' },
  { code: 'EUR', label: 'EUR (Europa)', flag: '🇪🇺' },
  { code: 'USD', label: 'USD (EUA)', flag: '🇺🇸' },
  { code: 'GBP', label: 'GBP (Reino Unido)', flag: '🇬🇧' },
  { code: 'BRL', label: 'BRL (Brasil)', flag: '🇧🇷' },
];

export function CurrencyFilter({ value, onValueChange }: CurrencyFilterProps) {
  const selectedCurrency = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full bg-background">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{selectedCurrency.flag}</span>
            <span>{selectedCurrency.code === 'all' ? 'Todas' : selectedCurrency.code}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="flex items-center gap-2">
              <span>{currency.flag}</span>
              <span>{currency.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
