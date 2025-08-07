
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useKambaLevels } from '@/hooks/useKambaLevels';
import { KambaBadge } from '@/components/KambaBadge';
import { KambaLevelsModal } from '@/components/KambaLevelsModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Eye } from 'lucide-react';

export function ModernKambaAchievements() {
  const { user } = useAuth();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const { currentLevel, nextLevel, progress, achievedLevels, allLevels } = useKambaLevels(totalRevenue);

  useEffect(() => {
    if (user) {
      loadTotalRevenue();
    }
  }, [user]);

  const loadTotalRevenue = async () => {
    if (!user) return;

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      const total = orders?.reduce((sum, order) => {
        const amount = parseFloat(order.amount) || 0;
        return sum + amount;
      }, 0) || 0;

      setTotalRevenue(total);
    } catch (error) {
      console.error('Error loading total revenue:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return `${(value / 1000000).toFixed(1)}M KZ`;
  };

  return (
    <>
      <Card className="bg-card shadow-sm border border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Conquistas Kamba
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal(true)}
              className="text-xs"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver todas
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Nível atual */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <KambaBadge totalRevenue={totalRevenue} size="md" showText={false} />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {currentLevel.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Faturamento: {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>

          {/* Progresso para próximo nível */}
          {nextLevel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progresso para {nextLevel.name}
                </span>
                <span className="font-medium text-foreground">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-2"
                style={{ '--progress-background': nextLevel.color } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(currentLevel.threshold)}</span>
                <span>{formatCurrency(nextLevel.threshold)}</span>
              </div>
            </div>
          )}

          {/* Níveis conquistados */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Selos Conquistados ({achievedLevels.length}/{allLevels.length})
            </p>
            <div className="flex gap-2 flex-wrap">
              {allLevels.map((level) => {
                const isAchieved = totalRevenue >= level.threshold;
                return (
                  <div
                    key={level.id}
                    className={`relative transition-all duration-200 ${
                      isAchieved ? 'scale-100' : 'scale-90 opacity-40'
                    }`}
                  >
                    <img
                      src={level.badge}
                      alt={level.name}
                      className="w-12 h-12 rounded-lg"
                      title={`${level.name} - ${formatCurrency(level.threshold)}`}
                    />
                    {!isAchieved && (
                      <div className="absolute inset-0 bg-slate-500/20 rounded-lg" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <KambaLevelsModal 
        open={showModal}
        onOpenChange={setShowModal}
        totalRevenue={totalRevenue}
      />
    </>
  );
}
