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
  { code: 'KZ', label: 'KZ (Angola)' },
  { code: 'MZN', label: 'MZN (Moçambique)' },
  { code: 'EUR', label: 'EUR (Europa)' },
  { code: 'USD', label: 'USD (EUA)' },
  { code: 'GBP', label: 'GBP (Reino Unido)' },
  { code: 'BRL', label: 'BRL (Brasil)' },
];

export function CurrencyFilter({ value, onValueChange }: CurrencyFilterProps) {
  const selectedCurrency = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full bg-background">
        <SelectValue>
          <span>{selectedCurrency.code}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span>{currency.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
