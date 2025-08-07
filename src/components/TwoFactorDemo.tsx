
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Monitor, MapPin, Clock } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';
import Intelligent2FAGate from './Intelligent2FAGate';
import { useAuth } from '@/contexts/AuthContext';

const TwoFactorDemo: React.FC = () => {
  const { user } = useAuth();
  const { deviceContext, settings } = use2FA();
  const [testingAction, setTestingAction] = useState<string | null>(null);

  const testActions = [
    {
      id: 'login',
      name: 'Teste de Login',
      description: 'Simula um login de novo dispositivo',
      icon: Monitor,
      color: 'blue'
    },
    {
      id: 'password_change',
      name: 'Alteração de Senha',
      description: 'Sempre requer 2FA',
      icon: Shield,
      color: 'red'
    },
    {
      id: 'withdrawal',
      name: 'Saque',
      description: 'Ação financeira sensível',
      icon: Smartphone,
      color: 'green'
    }
  ];

  const handleTestAction = (actionId: string) => {
    setTestingAction(actionId);
  };

  const handleTestComplete = () => {
    setTestingAction(null);
  };

  if (!settings?.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>2FA Inteligente</CardTitle>
          <CardDescription>
            Ative o 2FA primeiro para testar a funcionalidade inteligente
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (testingAction && user) {
    return (
      <Intelligent2FAGate
        eventType={testingAction as any}
        onSuccess={handleTestComplete}
        onCancel={handleTestComplete}
        userEmail={user.email || ''}
      >
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Processando teste de 2FA inteligente...</p>
        </div>
      </Intelligent2FAGate>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            2FA Inteligente Ativo
          </CardTitle>
          <CardDescription>
            O sistema analisa o contexto antes de solicitar verificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deviceContext && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Dispositivo Atual</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>{deviceContext.browser} em {deviceContext.os}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>{deviceContext.isMobile ? 'Mobile' : 'Desktop'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Localização</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{deviceContext.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>IP: {deviceContext.ipAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="border-t pt-4">
            <Badge variant="outline" className="text-green-700 bg-green-50">
              ✅ Sistema inteligente ativo
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste o 2FA Inteligente</CardTitle>
          <CardDescription>
            Teste como o sistema decide quando solicitar 2FA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  onClick={() => handleTestAction(action.id)}
                  className="h-auto p-4 flex-col space-y-2"
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{action.name}</span>
                  <span className="text-xs text-gray-500 text-center">
                    {action.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFactorDemo;
