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
  loading?: boolean;
}

const CURRENCIES = [
  { code: 'KZ', label: 'KZ (Angola)' },
  { code: 'MZN', label: 'MT (Moçambique)' },
  { code: 'EUR', label: 'EUR (Europa)' },
  { code: 'USD', label: 'USD (EUA)' },
  { code: 'GBP', label: 'GBP (Reino Unido)' },
  { code: 'BRL', label: 'BRL (Brasil)' },
];

export function CurrencyFilter({ value, onValueChange, loading }: CurrencyFilterProps) {
  // NÃO forçar CURRENCIES[0] como fallback - isso causava o "flash KZ"
  const selectedCurrency = CURRENCIES.find(c => c.code === value);

  return (
    <Select value={value || ''} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className="w-full h-9 sm:h-10 rounded-lg text-xs sm:text-sm bg-card text-card-foreground border-border">
        <SelectValue placeholder={loading ? "Carregando..." : "Moeda"} className="text-card-foreground">
          {selectedCurrency?.code || ''}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
