import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ExternalLink, TrendingUp, Target } from 'lucide-react';

interface UpsellConfiguratorProps {
  productId: string;
  onSaveSuccess: () => void;
}

interface UpsellSettings {
  enabled: boolean;
  link_pagina_upsell: string;
}

export function UpsellConfigurator({ productId, onSaveSuccess }: UpsellConfiguratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UpsellSettings>({
    enabled: false,
    link_pagina_upsell: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && productId) {
      loadSettings();
    }
  }, [user, productId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checkout_customizations')
        .select('settings')
        .eq('user_id', user?.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('Error loading upsell settings:', error);
      } else if (data?.settings && typeof data.settings === 'object' && data.settings !== null) {
        const settingsObj = data.settings as any;
        if (settingsObj.upsell) {
          setSettings(settingsObj.upsell);
        } else {
          // Se não há configurações de upsell, usar padrões
          setSettings({
            enabled: false,
            link_pagina_upsell: ''
          });
        }
      } else {
        // Se não há dados, usar padrões
        setSettings({
          enabled: false,
          link_pagina_upsell: ''
        });
      }
    } catch (error) {
      console.error('Error loading upsell settings:', error);
      // Em caso de erro, usar padrões
      setSettings({
        enabled: false,
        link_pagina_upsell: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user || !productId) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);

      // Primeiro, buscar configurações existentes
      const { data: existingData, error: selectError } = await supabase
        .from('checkout_customizations')
        .select('settings')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      // Mesclar configurações existentes com novas configurações de upsell
      const existingSettings = (existingData?.settings && typeof existingData.settings === 'object' && existingData.settings !== null) 
        ? existingData.settings as any 
        : {};
      const updatedSettings = {
        ...existingSettings,
        upsell: settings
      };

      // Tentar atualizar o registro existente
      const { data: updateData, error: updateError } = await supabase
        .from('checkout_customizations')
        .update({ settings: updatedSettings })
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .select();

      // Se não houve erro no update, significa que atualizou com sucesso
      if (!updateError && updateData && updateData.length > 0) {
        // Sucesso na atualização
      } else {
        // Se não encontrou registro para atualizar, criar um novo
        const { data: insertData, error: insertError } = await supabase
          .from('checkout_customizations')
          .insert({
            user_id: user.id,
            product_id: productId,
            settings: updatedSettings
          })
          .select();

        if (insertError) {
          throw insertError;
        }
      }

      toast({
        title: "✅ Upsell Configurado!",
        description: `Quando clientes comprarem este produto, serão redirecionados para: ${settings.link_pagina_upsell}`,
      });
      
      onSaveSuccess();
    } catch (error) {
      console.error('Error saving upsell settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Carregando configurações..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Upsell Pós-Compra</h2>
        <p className="text-muted-foreground">
          Configure uma oferta especial que será exibida após a compra do produto principal
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Configurações */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Configuração do Upsell
              </CardTitle>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="upsell-link">Link da Página de Upsell</Label>
              <Input
                id="upsell-link"
                type="url"
                placeholder="https://minha-pagina-de-upsell.com"
                value={settings.link_pagina_upsell}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, link_pagina_upsell: e.target.value }))
                }
                disabled={!settings.enabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Insira o link da página onde estará o botão de checkout do produto de upsell.
              </p>
            </div>

            {settings.enabled && !settings.link_pagina_upsell && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Configure o link da página de upsell para que ela seja exibida após a compra.
                </p>
              </div>
            )}

            {settings.enabled && settings.link_pagina_upsell && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">
                      ✅ Configuração ativa!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Após a compra, o cliente será redirecionado para: {settings.link_pagina_upsell}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={saveSettings} 
              className="w-full"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>

        {/* Informações e Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm">Cliente finaliza a compra</p>
                  <p className="text-xs text-muted-foreground">
                    O pedido principal é processado e concluído
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm">Redirecionamento automático</p>
                  <p className="text-xs text-muted-foreground">
                    Cliente é direcionado para sua página de upsell
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm">Oferta especial</p>
                  <p className="text-xs text-muted-foreground">
                    Cliente vê a oferta e pode fazer uma compra adicional
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-medium text-sm">Checkout separado</p>
                  <p className="text-xs text-muted-foreground">
                    Se aceitar, cliente faz novo checkout do produto de upsell
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Crie uma página atrativa com uma oferta irresistível para maximizar suas conversões de upsell!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}