import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [isExpired, setIsExpired] = useState(false);

  // Reiniciar contador quando modal abre
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(totalSeconds);
      setIsExpired(false);
    }
  }, [isOpen, totalSeconds]);

  // Contador principal
  useEffect(() => {
    if (!isOpen || isExpired) return;

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
  }, [isOpen, isExpired, onTimeExpired]);

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

  const handleRestart = () => {
    onRestart();
    setIsExpired(false);
    setTimeLeft(totalSeconds);
  };

  const circumference = 2 * Math.PI * 45; // raio de 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isExpired) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Resumo do pedido</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total</span>
                <span className="text-green-600 font-bold text-lg">{orderTotal}</span>
              </div>
            </div>

            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-3">
                  <p className="font-semibold">Tempo esgotado!</p>
                  <p className="text-sm">
                    O tempo para confirmar o pagamento expirou. Por favor, reinicie o processo para gerar uma nova solicitação de pagamento.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={handleRestart}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Repetir Pagamento
              </Button>
              <Button 
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Resumo do pedido</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total</span>
              <span className="text-green-600 font-bold text-lg">{orderTotal}</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="text-center space-y-4">
              <p className="text-gray-900 font-medium text-lg">
                Confirme o pagamento no seu telemóvel.
              </p>
              
              {/* Círculo de countdown */}
              <div className="relative inline-flex items-center justify-center">
                <svg 
                  width="120" 
                  height="120" 
                  className="transform -rotate-90"
                >
                  {/* Círculo de fundo */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Círculo de progresso */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke={getProgressColor()}
                    strokeWidth="8"
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
                  <span className="text-xs text-gray-500 mb-1">Tempo Restante</span>
                  <span className="text-2xl font-bold text-gray-900">{timeLeft}</span>
                  <span className="text-xs text-gray-500">segundos</span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  → Abra o aplicativo <strong>Multicaixa Express</strong> e procure por{' '}
                  <span className="text-red-600 font-bold">"Operação por Autorizar"</span>
                </p>
                <p>
                  → Selecione o pagamento pendente e <strong>confirme a transação</strong>
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpressPaymentModal;