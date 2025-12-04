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
  };
}

interface MobileMetricCardsProps {
  salesData: SalesData;
  loading: boolean;
  formatPrice: (amount: number) => string;
}

export function MobileMetricCards({ salesData, loading, formatPrice }: MobileMetricCardsProps) {
  const [showRevenue, setShowRevenue] = useState(true);

  return (
    <div className="space-y-4">
      {/* Total em vendas - Card principal */}
      <Card className="rounded-xl shadow-sm border-l-4 border-l-primary bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">Total em vendas</div>
              <div className="text-2xl font-bold text-foreground">
                {loading ? '...' : showRevenue ? formatPrice(salesData.totalRevenue) : '••••••••'}
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
              <span className="text-sm text-muted-foreground">Pedidos feitos</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">Últimos 30 dias</div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : salesData.totalSales}
            </div>
          </CardContent>
        </Card>

        {/* Pedidos pagos */}
        <Card className="rounded-xl shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Pedidos pagos</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">Últimos 30 dias</div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : Math.floor(salesData.totalSales * 0.3)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
