import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownLeft, Wallet, Receipt } from "lucide-react";
import { CurrencyTransaction } from "@/hooks/useCurrencyBalances";
import { useTranslation } from "@/hooks/useTranslation";

interface CurrencyTransactionHistoryProps {
  transactions: CurrencyTransaction[];
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

export function CurrencyTransactionHistory({
  transactions,
  currency,
  formatCurrency
}: CurrencyTransactionHistoryProps) {
  const { t } = useTranslation();

  const TRANSACTION_TYPES: Record<string, {
    label: string;
    color: string;
    icon: typeof ArrowUpRight;
    isPositive: boolean;
  }> = {
    'sale_revenue': { label: t('financial.transactions.sale'), color: 'bg-green-500', icon: ArrowDownLeft, isPositive: true },
    'subscription_sale': { label: t('subscriptions.title'), color: 'bg-green-500', icon: ArrowDownLeft, isPositive: true },
    'subscription_renewal': { label: t('subscriptions.title'), color: 'bg-green-500', icon: ArrowDownLeft, isPositive: true },
    'platform_fee': { label: t('financial.transactions.fee'), color: 'bg-orange-500', icon: Receipt, isPositive: false },
    'kambafy_fee': { label: t('financial.transactions.fee'), color: 'bg-orange-500', icon: Receipt, isPositive: false },
    'withdrawal': { label: t('financial.transactions.withdrawal'), color: 'bg-blue-500', icon: ArrowUpRight, isPositive: false },
    'refund': { label: t('financial.transactions.refund'), color: 'bg-red-500', icon: ArrowUpRight, isPositive: false },
    'platform_fee_refund': { label: t('financial.transactions.refund'), color: 'bg-red-500', icon: Receipt, isPositive: false },
    'adjustment': { label: t('financial.transactions.adjustment'), color: 'bg-purple-500', icon: Wallet, isPositive: true },
    'credit': { label: t('financial.transactions.sale'), color: 'bg-green-500', icon: ArrowDownLeft, isPositive: true },
    'debit': { label: t('financial.transactions.withdrawal'), color: 'bg-red-500', icon: ArrowUpRight, isPositive: false },
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('financial.transactions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('common.message.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t('financial.transactions.title')}</span>
          <Badge variant="secondary">{transactions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {transactions.map((tx) => {
              const typeConfig = TRANSACTION_TYPES[tx.type] || {
                label: tx.type,
                color: 'bg-gray-500',
                icon: Wallet,
                isPositive: tx.amount > 0
              };
              const Icon = typeConfig.icon;
              const isPositive = tx.amount > 0;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${typeConfig.color}/10`}>
                      <Icon className={`h-4 w-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {typeConfig.label}
                        </Badge>
                        <span>
                          {new Date(tx.created_at).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(tx.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
