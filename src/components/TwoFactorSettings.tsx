
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Mail, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { use2FA } from "@/hooks/use2FA";
import { useAuth } from "@/contexts/AuthContext";
import TwoFactorVerification from "./TwoFactorVerification";

export function TwoFactorSettings() {
  const { user } = useAuth();
  const { settings, loading, enable2FA, disable2FA, loadSettings } = use2FA();
  const [currentStep, setCurrentStep] = useState<'settings' | 'disable_2fa'>('settings');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Carregar configurações quando componente montar
  useEffect(() => {
    if (user) {
      loadSettings().then(() => {
        setInitialLoadDone(true);
      });
    }
  }, [user, loadSettings]);

  const handleEnable2FA = async () => {
    if (!user?.email || loading) {
      return;
    }
    
    const success = await enable2FA('email');
    
    if (success) {
      await loadSettings();
    }
  };

  const handleDisable2FA = () => {
    if (!user?.email || loading) {
      return;
    }
    
    setCurrentStep('disable_2fa');
  };

  const handle2FAVerificationSuccess = async () => {
    const success = await disable2FA();
    
    if (success) {
      setCurrentStep('settings');
      await loadSettings();
    }
  };

  const handle2FACancel = () => {
    setCurrentStep('settings');
  };

  // Mostrar skeleton enquanto carrega as configurações pela primeira vez
  if (!initialLoadDone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded" />
            <Skeleton className="h-5 w-64" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-11 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'disable_2fa' && user?.email) {
    return (
      <TwoFactorVerification
        email={user.email}
        onVerificationSuccess={handle2FAVerificationSuccess}
        onBack={handle2FACancel}
        context="disable_2fa"
      />
    );
  }

  const isEnabled = settings?.enabled ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
          Autenticação de Dois Fatores (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold">Status do 2FA</h3>
              <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
                {isEnabled ? "Ativado" : "Desativado"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isEnabled 
                ? "Sua conta está protegida com autenticação de dois fatores"
                : "Ative o 2FA para aumentar a segurança da sua conta"
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="2fa-toggle"
              checked={isEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnable2FA();
                } else {
                  handleDisable2FA();
                }
              }}
              disabled={loading}
            />
            <Label htmlFor="2fa-toggle" className="text-sm">
              {isEnabled ? "Ativado" : "Desativado"}
            </Label>
          </div>
        </div>

        {isEnabled && (
          <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-green-800 text-sm sm:text-base">Email</h4>
                <p className="text-xs sm:text-sm text-green-600">
                  Códigos de verificação são enviados para {user?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isEnabled && (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-blue-800 text-sm sm:text-base">Email</h4>
                  <p className="text-xs sm:text-sm text-blue-600">
                    Receba códigos de verificação por email
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-amber-800 text-sm sm:text-base">Importante</h4>
                  <p className="text-xs sm:text-sm text-amber-700">
                    O 2FA aumenta significativamente a segurança da sua conta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
