import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { formatPriceFromString } from '@/utils/priceFormatting';

interface BankAccount {
  id: string;
  name: string;
  available: boolean;
  iban: string;
  accountNumber: string;
  accountHolder: string;
  logo?: string;
}

interface BankTransferFormProps {
  totalAmount: string;
  currency?: string;
  onPaymentComplete?: (proofFile: File, selectedBank: string) => void;
  disabled?: boolean;
}

const BANKS: BankAccount[] = [
  {
    id: 'bci',
    name: 'BCI - Banco Comercial e de Investimentos',
    available: true,
    iban: '0005 0000 09802546101 15',
    accountNumber: '10980254610001',
    accountHolder: 'KAMBAFY COMERCIO E SERVICOS LDA',
    logo: '/lovable-uploads/451d9e0e-6608-409a-910a-ec955cb5223c.png'
  },
  {
    id: 'bai',
    name: 'BAI - Banco Angolano de Investimentos',
    available: false,
    iban: '',
    accountNumber: '',
    accountHolder: ''
  },
  {
    id: 'bfa',
    name: 'BFA - Banco de Fomento Angola',
    available: false,
    iban: '',
    accountNumber: '',
    accountHolder: ''
  },
  {
    id: 'sol',
    name: 'Banco SOL',
    available: false,
    iban: '',
    accountNumber: '',
    accountHolder: ''
  }
];

export function BankTransferForm({ 
  totalAmount, 
  currency = 'KZ',
  onPaymentComplete,
  disabled 
}: BankTransferFormProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast: showToast } = useCustomToast();

  // Always use BCI bank (first available bank)
  const bankData = BANKS.find(bank => bank.available) || BANKS[0];
  const formattedAmount = formatPriceFromString(totalAmount, undefined, true);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      title: 'Copiado!',
      message: `${label} copiado para a área de transferência`,
      variant: 'success'
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo (PDF, PNG, JPG, JPEG)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showToast({
        title: 'Tipo de arquivo inválido',
        message: 'Por favor, selecione um arquivo PDF ou imagem (PNG, JPG)',
        variant: 'error'
      });
      return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Arquivo muito grande',
        message: 'O arquivo deve ter no máximo 5MB',
        variant: 'error'
      });
      return;
    }

    setProofFile(file);
    showToast({
      title: 'Comprovativo carregado',
      message: 'Arquivo carregado com sucesso',
      variant: 'success'
    });
  };

  const handleConfirmPayment = () => {
    if (!proofFile) {
      showToast({
        title: 'Campos obrigatórios',
        message: 'Carregue o comprovativo',
        variant: 'error'
      });
      return;
    }

    onPaymentComplete?.(proofFile, bankData.id);
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Transferência Bancária</h3>
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-100">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Realize a transferência para a conta bancária abaixo.
          </AlertDescription>
        </Alert>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {bankData.logo && (
                <img 
                  src={bankData.logo} 
                  alt={bankData.name}
                  className="w-8 h-8 rounded"
                />
              )}
              <h4 className="font-semibold text-gray-900">DADOS BANCÁRIOS PARA PAGAMENTO</h4>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-600">IBAN:</span>
                  <div className="text-lg font-mono">{bankData.iban}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(bankData.iban, 'IBAN')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-600">NÚMERO DA CONTA:</span>
                  <div className="text-lg font-mono">{bankData.accountNumber}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(bankData.accountNumber, 'Número da conta')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-600">TITULAR DA CONTA:</span>
                  <div className="text-lg font-semibold">{bankData.accountHolder}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(bankData.accountHolder, 'Titular da conta')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Comprovativo
          </Label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="proof-upload"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
              disabled={disabled || isUploading}
            />
            
            {proofFile ? (
              <div className="flex items-center justify-center gap-3 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-medium">{proofFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                <div>
                  <Label 
                    htmlFor="proof-upload" 
                    className="text-blue-600 hover:text-blue-700 cursor-pointer underline"
                  >
                    Clique aqui para selecionar o arquivo
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    ou arraste e solte
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Escolha arquivos em .pdf, ou imagem com qualidade
                </p>
              </div>
            )}
          </div>

          {!proofFile && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Comprovante de pagamento é obrigatório
              </p>
              <p className="text-xs text-red-600 mt-1">
                Sem o comprovativo não é possível finalizar a compra
              </p>
            </div>
          )}
        </div>

        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <span className="text-sm font-medium text-green-700">Valor a transferir:</span>
          <div className="text-2xl font-bold text-green-600">{formattedAmount}</div>
        </div>

        <Button
          onClick={handleConfirmPayment}
          disabled={disabled || !proofFile}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          {!proofFile ? (
            'Carregue o comprovativo'
          ) : (
            `COMPRAR AGORA - ${formattedAmount}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}