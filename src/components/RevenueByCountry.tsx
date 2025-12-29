import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";

interface CountryRevenue {
  country: string;
  countryCode: string;
  currency: string;
  flag: string;
  amount: number;
  percentage: number;
}

interface RevenueByCountryProps {
  orders: Array<{
    customer_country?: string;
    original_currency?: string;
    original_amount?: number;
    earning_amount?: number;
    earning_currency?: string;
    currency?: string;
    amount?: string;
  }>;
  loading?: boolean;
}

const COUNTRY_CONFIG: Record<string, { flag: string; currency: string; name: string }> = {
  'AO': { flag: '🇦🇴', currency: 'KZ', name: 'Angola' },
  'Angola': { flag: '🇦🇴', currency: 'KZ', name: 'Angola' },
  'MZ': { flag: '🇲🇿', currency: 'MZN', name: 'Moçambique' },
  'Moçambique': { flag: '🇲🇿', currency: 'MZN', name: 'Moçambique' },
  'Mozambique': { flag: '🇲🇿', currency: 'MZN', name: 'Moçambique' },
  'PT': { flag: '🇵🇹', currency: 'EUR', name: 'Portugal' },
  'Portugal': { flag: '🇵🇹', currency: 'EUR', name: 'Portugal' },
  'ES': { flag: '🇪🇸', currency: 'EUR', name: 'Espanha' },
  'Espanha': { flag: '🇪🇸', currency: 'EUR', name: 'Espanha' },
  'Spain': { flag: '🇪🇸', currency: 'EUR', name: 'Espanha' },
  'GB': { flag: '🇬🇧', currency: 'GBP', name: 'Reino Unido' },
  'UK': { flag: '🇬🇧', currency: 'GBP', name: 'Reino Unido' },
  'United Kingdom': { flag: '🇬🇧', currency: 'GBP', name: 'Reino Unido' },
  'BR': { flag: '🇧🇷', currency: 'BRL', name: 'Brasil' },
  'Brasil': { flag: '🇧🇷', currency: 'BRL', name: 'Brasil' },
  'Brazil': { flag: '🇧🇷', currency: 'BRL', name: 'Brasil' },
};

const getCountryInfo = (country: string | undefined | null) => {
  if (!country) return { flag: '🌍', currency: 'KZ', name: 'Outros' };
  return COUNTRY_CONFIG[country] || { flag: '🌍', currency: 'KZ', name: country };
};

const formatCurrency = (amount: number, currency: string): string => {
  const formatted = amount.toLocaleString('pt-AO', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  switch (currency) {
    case 'EUR':
      return `€${formatted}`;
    case 'GBP':
      return `£${formatted}`;
    case 'USD':
      return `$${formatted}`;
    case 'MZN':
      return `${formatted} MZN`;
    case 'BRL':
      return `R$${formatted}`;
    default:
      return `${formatted} ${currency}`;
  }
};

export const RevenueByCountry: React.FC<RevenueByCountryProps> = ({ orders, loading }) => {
  const revenueByCountry = React.useMemo(() => {
    const grouped: Record<string, { amount: number; currency: string; flag: string; name: string }> = {};
    
    orders.forEach(order => {
      const countryInfo = getCountryInfo(order.customer_country);
      const key = countryInfo.name;
      
      // Use original currency/amount if available, otherwise use earning or order amount
      const currency = order.original_currency || order.earning_currency || order.currency || 'KZ';
      const amount = order.original_amount || order.earning_amount || parseFloat(order.amount || '0');
      
      if (!grouped[key]) {
        grouped[key] = {
          amount: 0,
          currency: countryInfo.currency,
          flag: countryInfo.flag,
          name: countryInfo.name
        };
      }
      
      grouped[key].amount += amount;
    });
    
    const total = Object.values(grouped).reduce((sum, g) => sum + g.amount, 0);
    
    return Object.entries(grouped)
      .map(([name, data]) => ({
        country: name,
        countryCode: name,
        currency: data.currency,
        flag: data.flag,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [orders]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Receita por Região
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (revenueByCountry.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Receita por Região
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem vendas neste período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Receita por Região
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {revenueByCountry.map((item) => (
            <div key={item.country} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.flag}</span>
                <span className="text-sm font-medium">{item.country}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold min-w-[100px] text-right">
                  {formatCurrency(item.amount, item.currency)}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  ({item.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
