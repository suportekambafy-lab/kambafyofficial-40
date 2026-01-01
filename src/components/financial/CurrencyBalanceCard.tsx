import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Shield, Eye, EyeOff, AlertCircle, ArrowDownCircle } from "lucide-react";
import { useState } from "react";
import { CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { Link } from "react-router-dom";

interface CurrencyBalanceCardProps {
  currency: string;
  balance: number;
  retainedBalance: number;
  totalWithdrawn: number;
  formatCurrency: (amount: number, currency: string) => string;
  onWithdraw: () => void;
  canWithdraw: boolean;
  isVerified: boolean;
}

export function CurrencyBalanceCard({
  currency,
  balance,
  retainedBalance,
  totalWithdrawn,
  formatCurrency,
  onWithdraw,
  canWithdraw,
  isVerified
}: CurrencyBalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
  
  const availableBalance = balance - retainedBalance;
  const minimumWithdrawal = config.minimumWithdrawal;

  const canWithdrawNow = canWithdraw && availableBalance >= minimumWithdrawal;

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Header with label */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Saldo Disponível em {config.name}
              </p>
            </div>
            
            {/* Balance and button row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary break-all">
                  {showBalance ? formatCurrency(availableBalance, currency) : '••••••'}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="h-8 w-8 shrink-0"
                >
                  {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>

              {canWithdrawNow && (
                <Button onClick={onWithdraw} className="w-full sm:w-auto shrink-0">
                  <PiggyBank className="h-4 w-4 mr-2" />
                  Sacar em {currency}
                </Button>
              )}
            </div>

            {/* Minimum withdrawal info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Saque mínimo: {formatCurrency(minimumWithdrawal, currency)}</span>
            </div>
          </div>

          {/* Verification warning */}
          {!isVerified && balance > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Verificação necessária para saques
                  </p>
                  <Link to="/identidade" className="text-yellow-700 dark:text-yellow-300 underline">
                    Verificar agora
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retained Balance Card (if any) */}
      {retainedBalance > 0 && (
        <Card className="border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Valor Retido
                  </p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(retainedBalance, currency)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                Em análise
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
