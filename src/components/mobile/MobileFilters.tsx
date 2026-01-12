
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductFilter } from '@/components/ProductFilter';

const CURRENCIES = [
  { value: 'KZ', label: 'KZ' },
  { value: 'EUR', label: 'EUR' },
  { value: 'MZN', label: 'MT' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
  { value: 'BRL', label: 'BRL' },
];

interface MobileFiltersProps {
  timeFilter: string;
  setTimeFilter: (value: string) => void;
  selectedProduct: string;
  setSelectedProduct: (value: string) => void;
  selectedCurrency: string;
  setSelectedCurrency: (value: string) => void;
}

export function MobileFilters({
  timeFilter,
  setTimeFilter,
  selectedProduct,
  setSelectedProduct,
  selectedCurrency,
  setSelectedCurrency
}: MobileFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="flex-1 h-12 rounded-xl border-border bg-card text-card-foreground">
            <SelectValue className="text-card-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mês</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-24 h-12 rounded-xl border-border bg-card text-card-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((currency) => (
              <SelectItem key={currency.value} value={currency.value}>
                {currency.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full">
        <ProductFilter 
          value={selectedProduct} 
          onValueChange={setSelectedProduct}
        />
      </div>
    </div>
  );
}
