import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import { CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SalesRevenueOverviewProps {
  revenueByMoeda: Record<string, number>;
  formatCurrency: (amount: number, currency: string) => string;
  loading?: boolean;
}

export function SalesRevenueOverview({ 
  revenueByMoeda, 
  formatCurrency,
  loading = false
}: SalesRevenueOverviewProps) {
  const currencies = Object.keys(revenueByMoeda).filter(c => revenueByMoeda[c] > 0);
  
  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Total em Vendas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-muted/50 h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currencies.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Total em Vendas</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Lucro líquido calculado das vendas completadas (8,99% comissão em KZ, 9,99% outras moedas)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Calculado diretamente das ordens completadas
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currencies.map(currency => {
            const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
            const commissionRate = currency === 'KZ' ? '8,99%' : '9,99%';
            
            return (
              <div 
                key={currency}
                className="bg-background/80 rounded-lg p-4 border shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{config.flag}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {config.name}
                  </span>
                </div>
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(revenueByMoeda[currency], currency)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Comissão: {commissionRate}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
