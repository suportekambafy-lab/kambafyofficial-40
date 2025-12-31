import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CurrencyBalance, CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { CurrencyBalanceCard } from "./CurrencyBalanceCard";
import { CurrencyTransactionHistory } from "./CurrencyTransactionHistory";

interface CurrencyTabsProps {
  balances: CurrencyBalance[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  formatCurrency: (amount: number, currency: string) => string;
  transactions: any[];
  onWithdraw: (currency: string) => void;
  canWithdraw: boolean;
  isVerified: boolean;
}

export function CurrencyTabs({
  balances,
  selectedCurrency,
  onCurrencyChange,
  formatCurrency,
  transactions,
  onWithdraw,
  canWithdraw,
  isVerified
}: CurrencyTabsProps) {
  // Filter to only show currencies with balance
  const activeCurrencies = balances.filter(b => b.balance > 0 || b.currency === 'KZ');
  
  // If no balances, show KZ by default
  const displayBalances = activeCurrencies.length > 0 
    ? activeCurrencies 
    : [{ id: 'default', currency: 'KZ', balance: 0, retained_balance: 0, updated_at: new Date().toISOString() }];

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
        <TabsContent key={balance.currency} value={balance.currency} className="space-y-6">
          <CurrencyBalanceCard
            currency={balance.currency}
            balance={balance.balance}
            retainedBalance={balance.retained_balance}
            formatCurrency={formatCurrency}
            onWithdraw={() => onWithdraw(balance.currency)}
            canWithdraw={canWithdraw && balance.balance > 0}
            isVerified={isVerified}
          />
          
          <CurrencyTransactionHistory
            transactions={transactions}
            currency={balance.currency}
            formatCurrency={formatCurrency}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
