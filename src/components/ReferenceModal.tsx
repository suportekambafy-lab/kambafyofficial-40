import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { format } from 'date-fns';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceData: {
    referenceNumber: string;
    entity: string;
    dueDate: string;
    amount: number;
    currency: string;
    productName: string;
    orderId: string;
  };
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  isOpen,
  onClose,
  referenceData
}) => {
  const { toast } = useCustomToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      message: `${label} copiado para a área de transferência`,
      variant: "success"
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: currency === 'KZ' ? 'AOA' : currency,
      minimumFractionDigits: 0
    }).format(amount).replace('AOA', 'KZ');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Clock className="w-5 h-5 text-orange-500" />
            Referência Gerada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Pagamento Pendente
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Use os dados abaixo para efetuar o pagamento
            </p>
          </div>

          {/* Reference Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Dados para pagamento
            </h3>
            
            {/* Entity */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Entidade:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{referenceData.entity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(referenceData.entity, 'Entidade')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Reference Number */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Referência:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{referenceData.referenceNumber}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(referenceData.referenceNumber, 'Referência')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Valor:</span>
              <span className="font-bold text-lg">
                {formatAmount(referenceData.amount, referenceData.currency)}
              </span>
            </div>

            {/* Due Date */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Data limite:</span>
              <span className="font-medium text-orange-600">
                {formatDate(referenceData.dueDate)}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Como pagar:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use o Multicaixa Express ou caixa automático</li>
              <li>• Digite a entidade: <strong>{referenceData.entity}</strong></li>
              <li>• Digite a referência: <strong>{referenceData.referenceNumber}</strong></li>
              <li>• Confirme o valor: <strong>{formatAmount(referenceData.amount, referenceData.currency)}</strong></li>
            </ul>
          </div>

          {/* Order Info */}
          <div className="text-center text-sm text-gray-500">
            <p>Produto: <span className="font-medium">{referenceData.productName}</span></p>
            <p>Pedido: <span className="font-medium">{referenceData.orderId}</span></p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={onClose}
            className="w-full"
            size="lg"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Entendi
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Após o pagamento, você receberá o acesso ao produto por email em até 5 minutos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};