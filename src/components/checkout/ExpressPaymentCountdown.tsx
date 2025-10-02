import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExpressPaymentCountdownProps {
  onTimeExpired: () => void;
  onRestart: () => void;
  isActive: boolean;
  totalSeconds?: number;
}

const ExpressPaymentCountdown: React.FC<ExpressPaymentCountdownProps> = ({
  onTimeExpired,
  onRestart,
  isActive,
  totalSeconds = 90
}) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isExpired, setIsExpired] = useState(false);

  // Reiniciar contador quando isActive muda para true
  useEffect(() => {
    if (isActive) {
      setTimeLeft(totalSeconds);
      setIsExpired(false);
    }
  }, [isActive, totalSeconds]);

  // Contador principal
  useEffect(() => {
    if (!isActive || isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isExpired, onTimeExpired]);

  // Calcular progresso (invertido para mostrar tempo restante)
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  
  // Calcular cor baseada no tempo restante
  const getProgressColor = () => {
    const percentage = (timeLeft / totalSeconds) * 100;
    
    if (percentage > 60) {
      return 'hsl(120, 70%, 50%)'; // Verde
    } else if (percentage > 30) {
      return 'hsl(45, 100%, 50%)'; // Amarelo/Laranja
    } else {
      return 'hsl(0, 70%, 50%)'; // Vermelho
    }
  };

  // Formatar tempo (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  if (isExpired) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-3">
              <p className="font-semibold">Tempo esgotado!</p>
              <p className="text-sm">
                O tempo para confirmar o pagamento expirou. Por favor, reinicie o processo para gerar uma nova solicitação de pagamento.
              </p>
              <Button 
                onClick={onRestart}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Repetir Pagamento
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              Tempo para confirmar pagamento
            </span>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {formatTime(timeLeft)}
          </div>
        </div>
        
        <Progress 
          value={progress}
          className="h-3"
          style={{
            '--progress-background': getProgressColor()
          } as React.CSSProperties}
        />
        
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-medium">
            ⏰ Você tem {formatTime(timeLeft)} para confirmar o pagamento
          </p>
          <p>
            → Abra o aplicativo <strong>Multicaixa Express</strong> e procure por <span className="text-red-600 font-bold">"Operação por Autorizar"</span>
          </p>
          <p>
            → Selecione o pagamento pendente e <strong>confirme a transação</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpressPaymentCountdown;