import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AbandonedCartIndicatorProps {
  hasDetected: boolean;
  abandonedPurchaseId: string | null;
  enabled?: boolean;
}

export function AbandonedCartIndicator({ 
  hasDetected, 
  abandonedPurchaseId, 
  enabled = false 
}: AbandonedCartIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isCountingDown, setIsCountingDown] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Iniciar contagem regressiva quando componente é montado
    setIsCountingDown(true);
    setTimeLeft(30);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsCountingDown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Não mostrar se não estiver habilitado (apenas para debug/teste)
  if (!enabled) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {hasDetected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : isCountingDown ? (
              <Clock className="h-5 w-5 text-orange-600 animate-pulse" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sistema de Recuperação</span>
              {hasDetected && (
                <Badge variant="secondary" className="text-xs">
                  Ativo
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {isCountingDown ? (
                <>
                  Detectando abandono em <span className="font-mono font-bold">{timeLeft}s</span>
                </>
              ) : hasDetected ? (
                <>
                  Carrinho abandonado detectado 
                  {abandonedPurchaseId && (
                    <span className="font-mono ml-1">#{abandonedPurchaseId.slice(-6)}</span>
                  )}
                </>
              ) : (
                "Sistema pronto para detectar abandono"
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}