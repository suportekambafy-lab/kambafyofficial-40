import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomToast } from '@/hooks/useCustomToast';

interface ExpressPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimeExpired: () => void;
  onRestart: () => void;
  totalSeconds?: number;
  orderTotal: string;
  productName: string;
}

const ExpressPaymentModal: React.FC<ExpressPaymentModalProps> = ({
  isOpen,
  onClose,
  onTimeExpired,
  onRestart,
  totalSeconds = 60,
  orderTotal,
  productName
}) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const { toast } = useCustomToast();

  // Reiniciar contador quando modal abre
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(totalSeconds);
    }
  }, [isOpen, totalSeconds]);

  // Contador principal
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Mostrar toast e fechar modal quando tempo esgotar
          toast({
            message: "O tempo para concluir o pagamento esgotou. Por favor, retaça o pagamento com rapidez.",
            variant: "error",
            duration: 8000
          });
          onTimeExpired();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onTimeExpired, onClose, onRestart, toast]);

  // Calcular progresso (0 a 100, onde 100 é tempo esgotado)
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  
  // Calcular cor baseada no tempo restante - de azul para vermelho
  const getProgressColor = () => {
    const percentage = (timeLeft / totalSeconds) * 100;
    
    if (percentage > 60) {
      return '#2563eb'; // Azul
    } else if (percentage > 30) {
      return '#f59e0b'; // Amarelo/Laranja
    } else {
      return '#dc2626'; // Vermelho
    }
  };

  const circumference = 2 * Math.PI * 90; // raio de 90 (maior)
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">        
        <div className="space-y-8 p-6">
          <div className="text-center space-y-6">
            <p className="text-gray-900 font-semibold text-xl">
              Confirme o pagamento no seu telemóvel
            </p>
            
            {/* Círculo de countdown - maior */}
            <div className="relative inline-flex items-center justify-center">
              <svg 
                width="200" 
                height="200" 
                className="transform -rotate-90"
              >
                {/* Círculo de fundo */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Círculo de progresso */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke={getProgressColor()}
                  strokeWidth="12"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: 'stroke-dashoffset 1s ease-in-out, stroke 1s ease-in-out'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm text-gray-500 mb-2">Tempo Restante</span>
                <span className="text-4xl font-bold text-gray-900">{timeLeft}</span>
                <span className="text-sm text-gray-500 mt-1">segundos</span>
              </div>
            </div>
            
            <div className="space-y-3 text-base text-gray-700 max-w-md mx-auto">
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">→</span>
                Abra o aplicativo <strong>Multicaixa Express</strong> e procure por{' '}
                <span className="text-red-600 font-bold">"Operação por Autorizar"</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">→</span>
                Selecione o pagamento pendente e <strong>confirme a transação</strong>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpressPaymentModal;