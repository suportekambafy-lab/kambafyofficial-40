
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Mail, MessageSquare, Shield, CheckCircle } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';

interface TwoFactorSetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  isFirstTime?: boolean;
}

const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  open,
  onClose,
  onComplete,
  isFirstTime = false
}) => {
  const { enable2FA, loading } = use2FA();
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'sms' | 'whatsapp' | 'authenticator'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'choose' | 'phone' | 'confirm'>('choose');

  const methods = [
    {
      id: 'email' as const,
      name: 'E-mail',
      description: 'Código enviado por e-mail',
      icon: Mail,
      security: 'Média',
      accessibility: 'Alta'
    },
    {
      id: 'sms' as const,
      name: 'SMS',
      description: 'Código enviado por SMS',
      icon: Smartphone,
      security: 'Alta',
      accessibility: 'Média'
    },
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp',
      description: 'Código enviado via WhatsApp',
      icon: MessageSquare,
      security: 'Alta',
      accessibility: 'Alta'
    },
    {
      id: 'authenticator' as const,
      name: 'Google Authenticator',
      description: 'App Authenticator (mais seguro)',
      icon: Shield,
      security: 'Muito Alta',
      accessibility: 'Média'
    }
  ];

  const handleMethodSelect = (method: typeof selectedMethod) => {
    setSelectedMethod(method);
    if (method === 'sms' || method === 'whatsapp') {
      setStep('phone');
    } else {
      setStep('confirm');
    }
  };

  const handlePhoneSubmit = () => {
    if (phoneNumber.trim()) {
      setStep('confirm');
    }
  };

  const handleEnable = async () => {
    const success = await enable2FA(
      selectedMethod,
      (selectedMethod === 'sms' || selectedMethod === 'whatsapp') ? phoneNumber : undefined
    );

    if (success) {
      onComplete();
      onClose();
    }
  };

  const handleSkip = () => {
    if (!isFirstTime) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={isFirstTime ? undefined : onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-green-600" />
            {isFirstTime ? 'Ativa a segurança Kamba?' : 'Configurar 2FA'}
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-6">
            {isFirstTime && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  Garante que só tu tens acesso à tua conta.
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Recomendamos ativar a segurança extra para proteger os teus ganhos.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-medium">Escolhe o teu método preferido:</Label>
              <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect}>
                {methods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Card 
                      key={method.id} 
                      className={`cursor-pointer transition-all ${
                        selectedMethod === method.id ? 'ring-2 ring-green-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleMethodSelect(method.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <CardTitle className="text-lg">{method.name}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Segurança</div>
                            <div className="text-sm font-medium">{method.security}</div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => handleMethodSelect(selectedMethod)} className="flex-1">
                Continuar
              </Button>
              {!isFirstTime && (
                <Button variant="outline" onClick={handleSkip}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                Número de telefone
              </h3>
              <p className="text-gray-600">
                Insere o teu número para receber códigos via {selectedMethod === 'sms' ? 'SMS' : 'WhatsApp'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Número de telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+244 900 000 000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handlePhoneSubmit} disabled={!phoneNumber.trim()} className="flex-1">
                Continuar
              </Button>
              <Button variant="outline" onClick={() => setStep('choose')}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Confirmar ativação
              </h3>
              <p className="text-gray-600">
                Vais ativar a autenticação de dois fatores via{' '}
                <span className="font-medium">
                  {methods.find(m => m.id === selectedMethod)?.name}
                </span>
                {(selectedMethod === 'sms' || selectedMethod === 'whatsapp') && phoneNumber && (
                  <span> para {phoneNumber}</span>
                )}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">O que isso significa?</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Vais receber códigos apenas em situações sensíveis</li>
                <li>• Login em dispositivos conhecidos não precisa código</li>
                <li>• Alterações de senha ou dados bancários sempre pedem confirmação</li>
                <li>• A tua conta fica muito mais segura</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleEnable} disabled={loading} className="flex-1">
                {loading ? 'Ativando...' : 'Ativar 2FA'}
              </Button>
              <Button variant="outline" onClick={() => setStep(selectedMethod === 'sms' || selectedMethod === 'whatsapp' ? 'phone' : 'choose')}>
                Voltar
              </Button>
              {!isFirstTime && (
                <Button variant="ghost" onClick={handleSkip}>
                  Agora não
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetupModal;
