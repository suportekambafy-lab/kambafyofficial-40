import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Shield, Eye, EyeOff, AlertCircle, Wifi } from "lucide-react";
import { useState } from "react";
import { CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import kambafyLogo from "@/assets/kambafy-logo-white.png";
import shapeGreenLight from "@/assets/card-shape-green-light.png";
import shapeYellow from "@/assets/card-shape-yellow.png";
import shapeGreenDark from "@/assets/card-shape-green-dark.png";
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
  formatCurrency,
  onWithdraw,
  canWithdraw,
  isVerified
}: CurrencyBalanceCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
  
  const availableBalance = balance - retainedBalance;
  const minimumWithdrawal = config.minimumWithdrawal;

  const canWithdrawNow = canWithdraw && availableBalance >= minimumWithdrawal;
  const showWithdrawButton = canWithdraw || availableBalance > 0;
  
  const cardNumber = user?.id ? formatCardNumber(user.id) : '•••• •••• •••• ••••';

  return (
    <div className="space-y-4">
      {/* Debit Card Style Balance */}
      <div className="relative w-full aspect-[1.6/1] max-w-md mx-auto">
        {/* Card Background with Gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-2xl overflow-hidden">
          {/* Decorative shapes */}
          <img 
            src={shapeGreenDark} 
            alt="" 
            className="absolute -left-8 bottom-0 w-72 h-auto opacity-40 pointer-events-none rotate-12"
          />
          <img 
            src={shapeYellow} 
            alt="" 
            className="absolute right-0 -top-4 w-64 h-auto opacity-50 pointer-events-none -rotate-6"
          />
          <img 
            src={shapeGreenLight} 
            alt="" 
            className="absolute -right-4 bottom-4 w-56 h-auto opacity-35 pointer-events-none rotate-3"
          />
          
          {/* Card Content */}
          <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-white">
            {/* Top Row: Logo and Chip */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {/* Chip */}
                <div className="w-10 h-7 sm:w-12 sm:h-8 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-inner">
                  <div className="w-6 h-4 sm:w-7 sm:h-5 rounded-sm bg-gradient-to-br from-yellow-200 to-yellow-400 border border-yellow-600/30" />
                </div>
                {/* Contactless */}
                <Wifi className="w-5 h-5 sm:w-6 sm:h-6 rotate-90 opacity-80" />
              </div>
              {/* Brand Logo */}
              <div className="text-right">
                <img 
                  src={kambafyLogo} 
                  alt="Kambafy" 
                  className="h-8 sm:h-10 w-auto ml-auto"
                />
                <p className="text-[10px] sm:text-xs opacity-60 mt-1">{config.name}</p>
              </div>
            </div>

            {/* Balance Section */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-xs sm:text-sm opacity-70 mb-1">
                {t("financial.balance.available")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {showBalance ? formatCurrency(availableBalance, currency) : '••••••••'}
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Row: Card Number */}
            <div className="space-y-2">
              <p className="text-xs opacity-60">Número do Cartão</p>
              <p className="font-mono text-sm sm:text-base tracking-widest opacity-90">
                {cardNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

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
