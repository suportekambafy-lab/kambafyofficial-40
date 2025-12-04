import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useKambaLevels } from '@/hooks/useKambaLevels';
import { KambaLevelsModal } from '@/components/KambaLevelsModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Target, Eye, EyeOff, Rocket } from 'lucide-react';

export function ModernKambaAchievements() {
  const { user } = useAuth();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const {
    currentLevel,
    nextLevel,
    progress,
  } = useKambaLevels(totalRevenue);

  useEffect(() => {
    if (user) {
      loadTotalRevenue();
    }
  }, [user]);

  const loadTotalRevenue = async () => {
    if (!user) return;
    try {
      const { data: userProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);
      
      if (productsError) throw productsError;
      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setTotalRevenue(0);
        return;
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('amount, seller_commission, currency')
        .in('product_id', userProductIds)
        .eq('status', 'completed')
        .neq('payment_method', 'member_access');

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      const total = orders?.reduce((sum, order) => {
        let amount = parseFloat(order.seller_commission?.toString() || '0');
        if (amount === 0) {
          const grossAmount = parseFloat(order.amount || '0');
          amount = grossAmount * 0.92;
        }
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            'MZN': 14.3
          };
          const rate = exchangeRates[order.currency.toUpperCase()] || 1;
          amount = Math.round(amount * rate);
        }
        return sum + amount;
      }, 0) || 0;

      setTotalRevenue(total);
    } catch (error) {
      console.error('Error loading total revenue:', error);
    }
  };

  const formatCurrency = (value: number) => {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1];
    return `${integerPart},${decimalPart} Kz`;
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M Kz`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}K Kz`;
    } else {
      return `${Math.round(value)} Kz`;
    }
  };

  return (
    <>
      <Card className="bg-card shadow-sm border border-border/50 w-full overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Minha evolução</h3>
              <p className="text-[11px] text-muted-foreground">Atualizado diariamente</p>
            </div>
            {currentLevel && (
              <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 px-2 py-0.5 text-xs">
                <Crown className="w-3 h-3 mr-1" />
                {currentLevel.name.replace('Kamba ', '')}
              </Badge>
            )}
          </div>

          {/* Main Illustration - Compact */}
          <div className="flex justify-center py-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
                  <Rocket className="w-7 h-7 text-blue-500" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-xl" />
            </div>
          </div>

          {/* Current Revenue - Compact */}
          <div className="text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xl font-bold text-orange-500">
                {showRevenue ? formatCurrency(totalRevenue) : '••••••'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowRevenue(!showRevenue)} className="h-6 w-6 p-0">
                {showRevenue ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Faturamento Atual</p>
          </div>

          {/* Progress Block - Compact */}
          {nextLevel && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-medium text-foreground">Você está conseguindo!</span>
              </div>
              
              <div className="space-y-1.5">
                <Progress value={progress} className="h-1.5 bg-muted [&>div]:bg-foreground dark:[&>div]:bg-white" />
                <p className="text-[11px] text-muted-foreground">
                  Fature <span className="text-orange-500 font-semibold">{formatCurrencyShort(nextLevel.threshold)}</span> e desbloqueie o {nextLevel.name.replace('Kamba ', '')}
                </p>
              </div>
            </div>
          )}

          {/* CTA Button - Compact */}
          <Button 
            variant="outline" 
            onClick={() => setShowModal(true)} 
            className="w-full h-10 bg-muted/50 hover:bg-muted border-border/50 text-sm"
          >
            <Trophy className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
            <span className="font-medium">Ver próximas conquistas</span>
          </Button>
        </CardContent>
      </Card>

      <KambaLevelsModal open={showModal} onOpenChange={setShowModal} totalRevenue={totalRevenue} />
    </>
  );
}
