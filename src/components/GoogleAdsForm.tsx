import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';

interface GoogleAdsFormProps {
  productId: string;
  onSaveSuccess?: () => void;
}

export function GoogleAdsForm({ productId, onSaveSuccess }: GoogleAdsFormProps) {
  const [conversionId, setConversionId] = useState('');
  const [conversionLabel, setConversionLabel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingSettings();
  }, [productId]);

  const fetchExistingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_ads_settings')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConversionId(data.conversion_id || '');
        setConversionLabel(data.conversion_label || '');
        setEnabled(data.enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching Google Ads settings:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conversionId.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira o ID de conversão do Google Ads",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: existing } = await supabase
        .from('google_ads_settings')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('google_ads_settings')
          .update({
            conversion_id: conversionId.trim(),
            conversion_label: conversionLabel.trim() || null,
            enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('google_ads_settings')
          .insert({
            user_id: user.id,
            product_id: productId,
            conversion_id: conversionId.trim(),
            conversion_label: conversionLabel.trim() || null,
            enabled,
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso!",
        description: "Configurações do Google Ads salvas com sucesso",
      });

      onSaveSuccess?.();
    } catch (error) {
      console.error('Error saving Google Ads settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do Google Ads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="conversionId">ID de Conversão *</Label>
          <Input
            id="conversionId"
            placeholder="AW-XXXXXXXXXX"
            value={conversionId}
            onChange={(e) => setConversionId(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            O ID de conversão do Google Ads (ex: AW-123456789)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conversionLabel">Label de Conversão (opcional)</Label>
          <Input
            id="conversionLabel"
            placeholder="abcDEF123"
            value={conversionLabel}
            onChange={(e) => setConversionLabel(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            O label específico da conversão para rastreamento de eventos
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Ativar integração</Label>
            <p className="text-sm text-muted-foreground">
              Ativar rastreamento do Google Ads para este produto
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </>
        )}
      </Button>
    </form>
  );
}
