import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useKambaLevels } from '@/hooks/useKambaLevels';
import { KambaLevelsModal } from '@/components/KambaLevelsModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Target, Eye, EyeOff, Rocket } from 'lucide-react';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';

export function ModernKambaAchievements() {
  const {
    user
  } = useAuth();
  const { preferredCurrency, currencyConfig } = usePreferredCurrency();
  const displayCurrency = preferredCurrency || currencyConfig?.code || 'KZ';
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const {
    currentLevel,
    nextLevel,
    progress,
    achievedLevels,
    allLevels
  } = useKambaLevels(totalRevenue);
  const loadTotalRevenue = useCallback(async () => {
    if (!user) return;

    try {
      // IMPORTANT: use RPC to avoid PostgREST 1000-row limit when sellers have many orders
      const { data, error } = await (supabase as any).rpc('get_my_gamification_total_kz');

      if (error) {
        console.error('Error loading gamification total (RPC):', error);
        return;
      }

      const total = typeof data === 'number' ? data : parseFloat(data || '0');
      setTotalRevenue(Number.isFinite(total) ? total : 0);
    } catch (error) {
      console.error('Error loading total revenue:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTotalRevenue();
      
      // Set up real-time subscription for orders
      const channel = supabase
        .channel('achievements-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('Achievements orders update:', payload);
            loadTotalRevenue();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadTotalRevenue]);
  const scaleForDisplay = (valueKZ: number) => (displayCurrency === 'EUR' ? valueKZ / 1000 : valueKZ);
  const formatInt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const formatCurrency = (valueKZ: number) => {
    const scaled = scaleForDisplay(valueKZ);
    return `${formatInt(scaled)} ${displayCurrency}`;
  };

  const formatCurrencyShort = (valueKZ: number) => {
    const scaled = scaleForDisplay(valueKZ);

    if (displayCurrency === 'EUR') {
      return `${formatInt(scaled)} ${displayCurrency}`;
    }

    if (scaled >= 1000000) return `${(scaled / 1000000).toFixed(1)}M ${displayCurrency}`;
    if (scaled >= 1000) return `${Math.round(scaled / 1000)}K ${displayCurrency}`;
    return `${Math.round(scaled)} ${displayCurrency}`;
  };
  return <>
      <Card className="bg-card shadow-sm border border-border/50 w-full overflow-hidden">
        <CardContent className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Minha evolução</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Atualizado diariamente</p>
            </div>
            {currentLevel && <Badge variant="outline" className="bg-[hsl(var(--checkout-orange))]/10 text-[hsl(var(--checkout-orange))] border-[hsl(var(--checkout-orange))]/30 px-3 py-1">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                {currentLevel.name}
              </Badge>}
          </div>

          {/* Main Illustration */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-[hsl(var(--checkout-orange))]/15 flex items-center justify-center animate-pulse">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-[hsl(var(--checkout-orange))]/20 flex items-center justify-center">
                  <Rocket className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-full blur-xl" />
            </div>
          </div>

          {/* Current Revenue */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-[hsl(var(--checkout-orange))]">
                {showRevenue ? formatCurrency(totalRevenue) : '••••••'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowRevenue(!showRevenue)} className="h-7 w-7 p-0">
                {showRevenue ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Faturamento Atual</p>
          </div>

          {/* Progress Block */}
          {nextLevel && <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Você está conseguindo!</span>
              </div>
              
              <div className="space-y-2">
                <Progress value={progress} className="h-2 bg-muted [&>div]:bg-primary" />
                <p className="text-xs text-muted-foreground">
                  Fature <span className="text-[hsl(var(--checkout-orange))] font-semibold">{formatCurrencyShort(nextLevel.threshold)}</span> e desbloqueie o {nextLevel.name}
                </p>
              </div>
            </div>}

          {/* Achievement Badges Preview */}
          

          {/* CTA Button */}
          <Button variant="outline" onClick={() => setShowModal(true)} className="w-full h-12 bg-secondary/50 hover:bg-secondary border-primary/20">
            <Trophy className="w-4 h-4 mr-2 text-[hsl(var(--checkout-orange))]" />
            <span className="font-medium">Ver próximas conquistas</span>
          </Button>
        </CardContent>
      </Card>

      <KambaLevelsModal open={showModal} onOpenChange={setShowModal} totalRevenue={totalRevenue} />
    </>;
}