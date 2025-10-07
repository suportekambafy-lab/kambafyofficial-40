
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFacebookPixelSettings } from '@/hooks/useFacebookPixelSettings';
import { useFacebookApiSettings } from '@/hooks/useFacebookApiSettings';

interface FacebookPixelFormProps {
  onSaveSuccess: () => void;
  productId: string;
}

export function FacebookPixelForm({ onSaveSuccess, productId }: FacebookPixelFormProps) {
  console.log('🏗️ FacebookPixelForm render - productId:', productId);
  
  const { 
    settings: pixelSettings, 
    setSettings: setPixelSettings, 
    saveSettings: savePixelSettings,
    loading: pixelLoading 
  } = useFacebookPixelSettings(productId);
  
  const { 
    settings: apiSettings, 
    setSettings: setApiSettings, 
    saveSettings: saveApiSettings,
    loading: apiLoading 
  } = useFacebookApiSettings();

  console.log('📋 Current settings:', { 
    pixelSettings, 
    apiSettings, 
    pixelLoading, 
    apiLoading 
  });


  const handleSavePixel = async () => {
    const success = await savePixelSettings(pixelSettings);
    if (success) {
      onSaveSuccess();
    }
  };

  const handleSaveApi = async () => {
    const success = await saveApiSettings(apiSettings);
    if (success) {
      onSaveSuccess();
    }
  };

  const handleSaveAll = async () => {
    // Automaticamente ativar o pixel quando salvar
    const activatedPixelSettings = { ...pixelSettings, enabled: true };
    const activatedApiSettings = { ...apiSettings, enabled: true };
    
    const pixelSuccess = await savePixelSettings(activatedPixelSettings);
    const apiSuccess = await saveApiSettings(activatedApiSettings);
    
    if (pixelSuccess && apiSuccess) {
      // Atualizar o estado local para refletir o status ativo
      setPixelSettings(activatedPixelSettings);
      setApiSettings(activatedApiSettings);
      onSaveSuccess();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Facebook Pixel & API</h2>
        <p className="text-muted-foreground">
          Configure o Pixel ID e API de Conversões em um só lugar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facebook Pixel & API de Conversões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="pixel-enabled"
              checked={pixelSettings.enabled}
              onCheckedChange={(checked) => setPixelSettings(prev => ({ ...prev, enabled: checked }))}
            />
            <Label htmlFor="pixel-enabled">Ativar Facebook Pixel</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixelId">ID do Pixel</Label>
            <Input
              id="pixelId"
              name="facebook-pixel-id"
              placeholder="Digite o ID do seu Facebook Pixel"
              value={pixelSettings.pixelId}
              onChange={(e) => setPixelSettings(prev => ({ ...prev, pixelId: e.target.value }))}
              autoComplete="off"
              data-form-type="other"
            />
            <p className="text-xs text-muted-foreground">
              Encontre seu Pixel ID no Gerenciador de Eventos do Facebook
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">API de Conversões (opcional)</Label>
            <Input
              id="accessToken"
              name="facebook-access-token"
              type="text"
              placeholder="Digite o Access Token"
              value={apiSettings.accessToken}
              onChange={(e) => setApiSettings(prev => ({ ...prev, accessToken: e.target.value }))}
              autoComplete="off"
              data-form-type="other"
            />
            <p className="text-xs text-muted-foreground">
              Token para API de Conversões (opcional)
            </p>
          </div>

          <Button onClick={handleSaveAll} className="w-full" size="lg">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
