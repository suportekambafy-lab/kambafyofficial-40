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
  totalSeconds = 90,
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
            duration: 8000,
            position: "top-center"
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
  
  // Calcular cor baseada no tempo restante - mudanças mais dramáticas nos últimos segundos
  const getProgressColor = () => {
    if (timeLeft > 20) {
      return 'hsl(var(--primary))'; // Azul Kambafy para maior parte do tempo
    } else if (timeLeft > 10) {
      return 'hsl(45, 93%, 47%)'; // Amarelo nos últimos 20 segundos
    } else if (timeLeft > 5) {
      return 'hsl(25, 95%, 53%)'; // Laranja nos últimos 10 segundos
    } else {
      return 'hsl(0, 84%, 60%)'; // Vermelho nos últimos 5 segundos
    }
  };

  const circumference = 2 * Math.PI * 90; // raio de 90 (maior)
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">        
        <div className="space-y-6 p-4">
          <div className="text-center space-y-4">
            <p className="text-gray-900 font-medium text-lg">
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
            
            <div className="space-y-2 text-sm text-gray-600 max-w-xs mx-auto">
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">→</span>
                Abra o <strong>Multicaixa Express</strong>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">→</span>
                Procure por <span className="text-red-600 font-bold">"Operação por Autorizar"</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">→</span>
                <strong>Confirme a transação</strong>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpressPaymentModal;