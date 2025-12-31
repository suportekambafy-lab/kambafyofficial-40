import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CurrencyBalance, CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { CurrencyBalanceCard } from "./CurrencyBalanceCard";

interface CurrencyTabsProps {
  balances: CurrencyBalance[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  formatCurrency: (amount: number, currency: string) => string;
  getTotalWithdrawn: (currency: string) => number;
  onWithdraw: (currency: string) => void;
  canWithdraw: boolean;
  isVerified: boolean;
}

// All supported currencies in order
const ALL_CURRENCIES = ['KZ', 'EUR', 'USD', 'GBP', 'MZN', 'BRL'];

export function CurrencyTabs({
  balances,
  selectedCurrency,
  onCurrencyChange,
  formatCurrency,
  getTotalWithdrawn,
  onWithdraw,
  canWithdraw,
  isVerified
}: CurrencyTabsProps) {
  // Create a map of existing balances
  const balanceMap = new Map(balances.map(b => [b.currency, b]));
  
  // Show all currencies, using existing balance or 0
  const displayBalances = ALL_CURRENCIES.map(currency => {
    const existing = balanceMap.get(currency);
    return existing || {
      id: `default-${currency}`,
      currency,
      balance: 0,
      retained_balance: 0,
      updated_at: new Date().toISOString()
    };
  });

  return (
    <Tabs value={selectedCurrency} onValueChange={onCurrencyChange} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-4">
        {displayBalances.map((balance) => {
          const config = CURRENCY_CONFIG[balance.currency] || CURRENCY_CONFIG['KZ'];
          return (
            <TabsTrigger 
              key={balance.currency} 
              value={balance.currency}
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
            >
              <span className="text-lg">{config.flag}</span>
              <span className="font-medium">{balance.currency}</span>
              {balance.balance > 0 && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  ({formatCurrency(balance.balance, balance.currency)})
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {displayBalances.map((balance) => (
        <TabsContent key={balance.currency} value={balance.currency}>
          <CurrencyBalanceCard
            currency={balance.currency}
            balance={balance.balance}
            retainedBalance={balance.retained_balance}
            totalWithdrawn={getTotalWithdrawn(balance.currency)}
            formatCurrency={formatCurrency}
            onWithdraw={() => onWithdraw(balance.currency)}
            canWithdraw={canWithdraw && balance.balance > 0}
            isVerified={isVerified}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
