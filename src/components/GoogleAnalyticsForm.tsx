
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import googleAnalyticsLogo from '@/assets/google-analytics-logo.png';

interface GoogleAnalyticsFormProps {
  productId: string;
  onSaveSuccess?: () => void;
}

export function GoogleAnalyticsForm({ productId, onSaveSuccess }: GoogleAnalyticsFormProps) {
  const [measurementId, setMeasurementId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!measurementId.trim()) {
      toast.error('Por favor, insira o ID de medição do Google Analytics');
      return;
    }

    // Validate measurement ID format (G-XXXXXXXXXX)
    if (!measurementId.match(/^G-[A-Z0-9]+$/i)) {
      toast.error('Formato inválido. Use o formato G-XXXXXXXXXX');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado');
        return;
      }

      const { error } = await supabase
        .from('google_analytics_settings' as any)
        .insert({
          user_id: user.id,
          product_id: productId,
          measurement_id: measurementId.trim(),
          enabled: true
        });

      if (error) {
        console.error('Error saving Google Analytics:', error);
        toast.error('Erro ao salvar configurações');
        return;
      }

      toast.success('Google Analytics configurado com sucesso!');
      onSaveSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <img 
          src={googleAnalyticsLogo} 
          alt="Google Analytics" 
          className="h-10 object-contain"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="measurementId">ID do Pixel do Google Analytics</Label>
        <Input
          id="measurementId"
          placeholder="Ex: G-XXXXXXXX"
          value={measurementId}
          onChange={(e) => setMeasurementId(e.target.value.toUpperCase())}
          className="font-mono"
        />
        <p className="text-sm text-muted-foreground">
          Dúvidas?{' '}
          <a 
            href="https://support.google.com/analytics/answer/9539598" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Aprenda a configurar um pixel do Google Analytics
          </a>
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
