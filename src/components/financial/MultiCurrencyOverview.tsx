import { CurrencyBalance, CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";

interface MultiCurrencyOverviewProps {
  balances: CurrencyBalance[];
  formatCurrency: (amount: number, currency: string) => string;
  getTotalInKZ: () => number;
}

export function MultiCurrencyOverview({
  balances,
  formatCurrency,
  getTotalInKZ
}: MultiCurrencyOverviewProps) {
  // Aggregate balances by currency to avoid duplicates
  const aggregatedBalances = balances.reduce((acc, balance) => {
    const existing = acc.find(b => b.currency === balance.currency);
    if (existing) {
      existing.balance += balance.balance;
      existing.retained_balance += balance.retained_balance;
    } else {
      acc.push({ ...balance });
    }
    return acc;
  }, [] as CurrencyBalance[]);

  const activeCurrencies = aggregatedBalances.filter(b => b.balance > 0);
  
  if (activeCurrencies.length <= 1) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Resumo Multi-Moeda</h3>
      <div className="flex flex-wrap gap-4">
        {activeCurrencies.map((balance) => {
          const config = CURRENCY_CONFIG[balance.currency] || CURRENCY_CONFIG['KZ'];
          return (
            <div key={balance.currency} className="flex items-center gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{config.name}</p>
                <p className="font-bold text-foreground">
                  {formatCurrency(balance.balance, balance.currency)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {activeCurrencies.length > 1 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Equivalente total aproximado: <span className="font-bold text-foreground">{formatCurrency(getTotalInKZ(), 'KZ')}</span>
          </p>
        </div>
      )}
    </div>
  );
}
