
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Mail, AlertTriangle, Link } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { use2FA } from "@/hooks/use2FA";
import { useAuth } from "@/contexts/AuthContext";
import TwoFactorVerification from "./TwoFactorVerification";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/useCustomToast";

export function TwoFactorSettings() {
  const { user } = useAuth();
  const { settings, loading, enable2FA, disable2FA, loadSettings } = use2FA();
  const [currentStep, setCurrentStep] = useState<'settings' | 'disable_2fa'>('settings');
  const [isLinkingExternalId, setIsLinkingExternalId] = useState(false);

  // Mostrar estado padrão enquanto carrega
  const currentSettings = settings || { enabled: false, method: 'email' };

  // Carregar configurações quando componente montar
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  const handleEnable2FA = async () => {
    if (!user?.email || loading) {
      return;
    }
    
    const success = await enable2FA('email');
    
    if (success) {
      await loadSettings(); // Recarregar configurações
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
      await loadSettings(); // Recarregar configurações
    }
  };

  const handle2FACancel = () => {
    setCurrentStep('settings');
  };

  const linkExternalId = async () => {
    if (!user?.id) {
      toast({ 
        title: "Erro", 
        description: "Usuário não autenticado", 
        variant: "destructive" 
      });
      return;
    }

    setIsLinkingExternalId(true);

    try {
      // Buscar o player_id do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.onesignal_player_id) {
        toast({ 
          title: "Erro", 
          description: "Player ID não encontrado. Ative as notificações primeiro.", 
          variant: "destructive" 
        });
        return;
      }

      // Chamar a função edge para vincular o external_id
      const { error: linkError } = await supabase.functions.invoke('link-onesignal-external-id', {
        body: {
          user_id: user.id,
          player_id: profile.onesignal_player_id
        }
      });

      if (linkError) {
        throw linkError;
      }

      toast({ 
        title: "Sucesso!", 
        description: "External ID vinculado com sucesso no OneSignal"
      });

    } catch (error) {
      console.error('Erro ao vincular External ID:', error);
      toast({ 
        title: "Erro", 
        description: "Falha ao vincular External ID", 
        variant: "destructive" 
      });
    } finally {
      setIsLinkingExternalId(false);
    }
  };

  // Se está no processo de desativação do 2FA
  if (currentStep === 'disable_2fa' && user?.email) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            Desativar Autenticação de Dois Fatores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorVerification
            email={user.email}
            context="disable_2fa"
            onVerificationSuccess={handle2FAVerificationSuccess}
            onBack={handle2FACancel}
          />
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Card para OneSignal */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Link className="h-5 w-5 sm:h-6 sm:w-6" />
            OneSignal External ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vincule seu External ID no OneSignal para receber notificações personalizadas.
          </p>
          <Button 
            onClick={linkExternalId}
            disabled={isLinkingExternalId || !user?.id}
            className="w-full sm:w-auto"
          >
            {isLinkingExternalId ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Vinculando...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Revincular External ID
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold">Status do 2FA</h3>
                  <Badge variant={currentSettings.enabled ? "default" : "secondary"} className="text-xs">
                    {currentSettings.enabled ? "Ativado" : "Desativado"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentSettings.enabled 
                    ? "Sua conta está protegida com autenticação de dois fatores"
                    : "Ative o 2FA para aumentar a segurança da sua conta"
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="2fa-toggle"
                  checked={currentSettings.enabled}
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
                  {currentSettings.enabled ? "Ativado" : "Desativado"}
                </Label>
              </div>
            </div>

              {currentSettings.enabled && (
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

              {!currentSettings.enabled && (
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
            </>
        </CardContent>
      </Card>
    </div>
  );
}
