import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyBalance, CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { CurrencyBalanceCard } from "./CurrencyBalanceCard";
import { Wallet } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface CurrencyTabsProps {
  balances: CurrencyBalance[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  formatCurrency: (amount: number, currency: string) => string;
  getTotalWithdrawn: (currency: string) => number;
  getTotalRevenue?: (currency: string) => number;
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
  getTotalRevenue,
  onWithdraw,
  canWithdraw,
  isVerified
}: CurrencyTabsProps) {
  const { t } = useTranslation();
  
  // Create a map of existing balances
  const balanceMap = new Map(balances.map(b => [b.currency, b]));
  
  // Get the current balance for selected currency
  const getBalance = (currency: string) => {
    const existing = balanceMap.get(currency);
    return existing || {
      id: `default-${currency}`,
      currency,
      balance: 0,
      retained_balance: 0,
      updated_at: new Date().toISOString()
    };
  };

  const currentBalance = getBalance(selectedCurrency);
  const config = CURRENCY_CONFIG[selectedCurrency] || CURRENCY_CONFIG['KZ'];

  return (
    <div className="space-y-4">
      {/* Currency Dropdown Filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span>{t("common.table.currency")}:</span>
        </div>
        <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="w-[180px] bg-background text-foreground">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{config.name}</span>
                <span className="text-foreground/70">({selectedCurrency})</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            {ALL_CURRENCIES.map((currency) => {
              const currencyConfig = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
              const balance = getBalance(currency);
              return (
                <SelectItem 
                  key={currency} 
                  value={currency}
                  className="cursor-pointer hover:bg-muted"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium">{currencyConfig.name}</span>
                    <span className="text-muted-foreground">({currency})</span>
                    {balance.balance > 0 && (
                      <span className="ml-auto text-xs text-primary font-medium">
                        {formatCurrency(balance.balance, currency)}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Balance Card for Selected Currency */}
      <CurrencyBalanceCard
        currency={currentBalance.currency}
        balance={currentBalance.balance}
        retainedBalance={currentBalance.retained_balance}
        totalWithdrawn={getTotalWithdrawn(currentBalance.currency)}
        totalRevenue={getTotalRevenue?.(currentBalance.currency) ?? 0}
        formatCurrency={formatCurrency}
        onWithdraw={() => onWithdraw(currentBalance.currency)}
        canWithdraw={canWithdraw && currentBalance.balance > 0}
        isVerified={isVerified}
      />
    </div>
  );
}
