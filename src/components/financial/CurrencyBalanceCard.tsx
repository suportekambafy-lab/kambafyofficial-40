import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Shield, Eye, EyeOff, AlertCircle, Wifi, CreditCard, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import kambafyLogo from "@/assets/kambafy-logo-white.png";

interface CurrencyBalanceCardProps {
  currency: string;
  balance: number;
  retainedBalance: number;
  totalWithdrawn: number;
  totalRevenue?: number;
  formatCurrency: (amount: number, currency: string) => string;
  onWithdraw: () => void;
  canWithdraw: boolean;
  isVerified: boolean;
}

// Formata o ID do usuário como número de cartão (4 grupos de 4 caracteres)
function formatCardNumber(userId: string): string {
  // Remove hífens e pega os primeiros 16 caracteres
  const cleanId = userId.replace(/-/g, '').substring(0, 16).toUpperCase();
  // Divide em grupos de 4
  const groups = cleanId.match(/.{1,4}/g) || [];
  return groups.join(' ');
}

export function CurrencyBalanceCard({
  currency,
  balance,
  retainedBalance,
  totalWithdrawn,
  totalRevenue = 0,
  formatCurrency,
  onWithdraw,
  canWithdraw,
  isVerified
}: CurrencyBalanceCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'simple'>('card');
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
  
  const availableBalance = balance - retainedBalance;
  const minimumWithdrawal = config.minimumWithdrawal;

  const canWithdrawNow = canWithdraw && availableBalance >= minimumWithdrawal;
  const showWithdrawButton = canWithdraw || availableBalance > 0;
  
  const cardNumber = user?.id ? formatCardNumber(user.id) : '•••• •••• •••• ••••';
  
  // Black card for total revenue >= 10 million
  const isBlackCard = totalRevenue >= 10000000;

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
        <Button
          variant={viewMode === 'card' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('card')}
          className="flex items-center gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Card
        </Button>
        <Button
          variant={viewMode === 'simple' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('simple')}
          className="flex items-center gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          Cartão
        </Button>
      </div>

      {/* Card View Mode */}
      {viewMode === 'card' ? (
        <div className="relative w-full aspect-[1.7/1] max-w-md mx-auto">
          {/* Card Background with Gradient */}
          <div className={`absolute inset-0 rounded-2xl shadow-2xl overflow-hidden ${
            isBlackCard 
              ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900' 
              : 'bg-gradient-to-br from-primary via-primary to-primary/80'
          }`}>
            
            <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-white z-10">
              {/* Top Row: Chip and Logo */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Chip */}
                    <div className="w-11 h-8 sm:w-14 sm:h-10 rounded-lg bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg">
                      <div className="w-7 h-5 sm:w-9 sm:h-6 rounded bg-gradient-to-br from-yellow-200 to-yellow-400 border border-yellow-600/20" />
                    </div>
                    {/* Contactless */}
                    <Wifi className="w-6 h-6 rotate-90 opacity-70" />
                  </div>
                  {/* Brand Logo */}
                  <img 
                    src={kambafyLogo} 
                    alt="Kambafy" 
                    className="h-7 sm:h-9 w-auto drop-shadow-md"
                  />
                </div>
                {/* Currency Name - Below logo, aligned with logo end */}
                <p className="text-xs sm:text-sm opacity-70 font-medium text-right mr-3 -mt-1">{config.name}</p>
              </div>

              {/* Balance Section */}
              <div className="flex-1 flex flex-col justify-center py-2">
                <p className="text-xs sm:text-sm opacity-80 mb-1 font-medium">
                  {t("financial.balance.available")}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-sm">
                    {showBalance ? formatCurrency(availableBalance, currency) : '••••••••'}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Bottom Row: Card Number */}
              <div>
                <p className="text-[11px] sm:text-xs opacity-60 mb-1">Número do Cartão</p>
                <p className="font-mono text-base sm:text-lg tracking-[0.2em] font-medium">
                  {cardNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Simple Card View Mode */
        <Card className="max-w-md mx-auto border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isBlackCard 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{config.name}</p>
                  <p className="text-xs text-muted-foreground/70">{currency === 'MZN' ? 'MT' : currency}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                {showBalance ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("financial.balance.available")}
                </p>
                <p className={`text-3xl font-bold ${
                  isBlackCard ? 'text-zinc-900 dark:text-zinc-100' : 'text-primary'
                }`}>
                  {showBalance ? formatCurrency(availableBalance, currency) : '••••••••'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Total</p>
                  <p className="text-sm font-semibold">
                    {showBalance ? formatCurrency(balance, currency) : '••••'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sacado</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {showBalance ? formatCurrency(totalWithdrawn, currency) : '••••'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw Button and Info */}
      <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
        {/* Minimum withdrawal info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{t("financial.withdrawal.minAmount")} {formatCurrency(minimumWithdrawal, currency)}</span>
        </div>

        {showWithdrawButton && (
          <Button 
            onClick={onWithdraw} 
            className="w-full"
            size="lg"
            disabled={!canWithdrawNow}
          >
            <PiggyBank className="h-4 w-4 mr-2" />
            {t("financial.withdrawal.requestWithdrawal")}
          </Button>
        )}

        {/* Verification warning */}
        {!isVerified && balance > 0 && (
          <div className="w-full p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t("financial.verification.pendingTitle")}
                </p>
                <Link to="/identidade" className="text-yellow-700 dark:text-yellow-300 underline">
                  {t("financial.verification.verifyNow")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Retained Balance Card (if any) */}
      {retainedBalance > 0 && (
        <Card className="border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20 max-w-md mx-auto">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {t("financial.balance.retained")}
                  </p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(retainedBalance, currency)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                {t("financial.status.inReview")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}