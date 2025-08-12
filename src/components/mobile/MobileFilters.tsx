
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductFilter } from '@/components/ProductFilter';

interface MobileFiltersProps {
  timeFilter: string;
  setTimeFilter: (value: string) => void;
  selectedProduct: string;
  setSelectedProduct: (value: string) => void;
}

export function MobileFilters({
  timeFilter,
  setTimeFilter,
  selectedProduct,
  setSelectedProduct
}: MobileFiltersProps) {
  return (
    <div className="space-y-3">
      <Select value={timeFilter} onValueChange={setTimeFilter}>
        <SelectTrigger className="w-full h-12 rounded-xl border-border bg-card text-card-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="semana">Esta Semana</SelectItem>
          <SelectItem value="mes">Este Mês</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-full">
        <ProductFilter 
          value={selectedProduct} 
          onValueChange={setSelectedProduct}
        />
      </div>
    </div>
  );
}
