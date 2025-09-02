
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';
import { CustomIcon } from '@/components/ui/custom-icon';

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
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <CustomIcon name="dollar" size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">Valor líquido</div>
              <div className="text-2xl font-bold text-foreground">
                {loading ? '...' : formatPrice(salesData.totalRevenue)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">Vendas</div>
              <div className="text-2xl font-bold text-foreground">
                {loading ? '...' : salesData.totalSales}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
