import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from 'lucide-react';

interface SalesData {
  totalRevenue: number;
  totalSales: number;
  revenueByMoeda: {
    KZ: number;
    EUR: number;
    MZN: number;
    USD: number;
    GBP: number;
    BRL: number;
  };
}

interface MobileMetricCardsProps {
  salesData: SalesData;
  loading: boolean;
  formatPrice: (amount: number, currency?: string) => string;
  selectedCurrency: string;
}

export function MobileMetricCards({ salesData, loading, formatPrice, selectedCurrency }: MobileMetricCardsProps) {
  const [showRevenue, setShowRevenue] = useState(true);

  // Get the revenue for the selected currency
  const currencyRevenue = salesData.revenueByMoeda[selectedCurrency as keyof typeof salesData.revenueByMoeda] || 0;

  return (
    <div className="space-y-4">
      {/* Total em vendas - Card principal */}
      <Card className="rounded-xl shadow-sm border-l-4 border-l-primary bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">Receita Líquida ({selectedCurrency})</div>
              <div className="text-2xl font-bold text-foreground">
                {loading ? '...' : showRevenue ? formatPrice(currencyRevenue, selectedCurrency) : '••••••••'}
              </div>
            </div>
            <button 
              onClick={() => setShowRevenue(!showRevenue)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              {showRevenue ? (
                <Eye className="w-5 h-5 text-muted-foreground" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Cards lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pedidos feitos */}
        <Card className="rounded-xl shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Pedidos ({selectedCurrency})</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : salesData.totalSales}
            </div>
          </CardContent>
        </Card>

        {/* Pedidos pagos */}
        <Card className="rounded-xl shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Pagos ({selectedCurrency})</span>
            </div>
            <div className="text-2xl font-bold text-checkout-green">
              {loading ? '...' : salesData.totalSales}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
