import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useKambaLevels } from '@/hooks/useKambaLevels';
import { KambaBadge } from '@/components/KambaBadge';
import { KambaLevelsModal } from '@/components/KambaLevelsModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, Eye } from 'lucide-react';
export function ModernKambaAchievements() {
  const {
    user
  } = useAuth();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const {
    currentLevel,
    nextLevel,
    progress,
    achievedLevels,
    allLevels
  } = useKambaLevels(totalRevenue);
  useEffect(() => {
    if (user) {
      loadTotalRevenue();
    }
  }, [user]);
  const loadTotalRevenue = async () => {
    if (!user) return;
    try {
      // Primeiro, buscar produtos do usuário
      const {
        data: userProducts,
        error: productsError
      } = await supabase.from('products').select('id').eq('user_id', user.id);
      if (productsError) throw productsError;
      const userProductIds = userProducts?.map(p => p.id) || [];
      if (userProductIds.length === 0) {
        setTotalRevenue(0);
        return;
      }

      // Buscar vendas usando product_id - EXCLUIR member_access
      const {
        data: orders,
        error
      } = await supabase.from('orders').select('amount, seller_commission, currency').in('product_id', userProductIds).eq('status', 'completed').neq('payment_method', 'member_access');
      if (error) {
        console.error('Error loading orders:', error);
        return;
      }
      const total = orders?.reduce((sum, order) => {
        // ✅ Usar seller_commission se disponível, senão descontar 8% do amount
        let amount = parseFloat(order.seller_commission?.toString() || '0');
        if (amount === 0) {
          const grossAmount = parseFloat(order.amount || '0');
          amount = grossAmount * 0.92; // Descontar 8% da plataforma
        }
        
        // Converter para KZ se necessário
        if (order.currency && order.currency !== 'KZ') {
          const exchangeRates: Record<string, number> = {
            'EUR': 1053,
            // 1 EUR = ~1053 KZ
            'MZN': 14.3 // 1 MZN = ~14.3 KZ
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
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M KZ`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}K KZ`;
    } else {
      return `${Math.round(value)} KZ`;
    }
  };
  return <>
      <Card className="bg-card shadow-sm border border-border w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
              <span className="truncate">Conquistas Kamba</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="text-[10px] sm:text-xs shrink-0 h-7 sm:h-8 px-2 sm:px-3">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">Ver todas</span>
              <span className="sm:hidden">Ver</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 overflow-x-hidden pb-3 sm:pb-4">
          {/* Nível atual */}
          

          {/* Progresso para próximo nível */}
          {nextLevel && <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground truncate">
                  Progresso para {nextLevel.name}
                </span>
                <span className="font-medium text-foreground shrink-0 ml-2">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5 sm:h-2 [&>div]:bg-yellow-500" />
              <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>{formatCurrency(totalRevenue)}</span>
                <span>{formatCurrency(nextLevel.threshold)}</span>
              </div>
            </div>}

          {/* Níveis conquistados */}
          <div className="space-y-1.5">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              Selos Conquistados ({achievedLevels.length}/{allLevels.length})
            </p>
            <TooltipProvider>
              <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
                {allLevels.map(level => {
                  const isAchieved = totalRevenue >= level.threshold;
                  return (
                    <Tooltip key={level.id}>
                      <TooltipTrigger asChild>
                        <div className={`relative transition-all duration-200 cursor-help touch-manipulation shrink-0 ${isAchieved ? 'scale-100' : 'scale-90 opacity-40'}`}>
                          <img 
                            src={level.badge} 
                            alt={level.name} 
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                          {!isAchieved && <div className="absolute inset-0 bg-slate-500/20 rounded-xl" />}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p className="text-xs">{level.name} - {formatCurrency(level.threshold)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      <KambaLevelsModal open={showModal} onOpenChange={setShowModal} totalRevenue={totalRevenue} />
    </>;
}