import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TikTokPixel {
  id?: string;
  pixelId: string;
  enabled: boolean;
  events: string[];
}

export const useTikTokPixelList = (productId?: string) => {
  const [pixels, setPixels] = useState<TikTokPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPixels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !productId) {
        setPixels([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tiktok_pixel_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const items = data as any[] || [];
      setPixels(items.map((item: any) => ({
        id: item.id,
        pixelId: item.pixel_id,
        enabled: item.enabled,
        events: item.events || ['purchase', 'initiate_checkout', 'view_content']
      })));
    } catch (error) {
      console.error('Error fetching TikTok pixels:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar pixels do TikTok",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPixel = async (pixelData: Omit<TikTokPixel, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        toast({
          title: "Erro",
          description: "Você precisa estar logado para adicionar um pixel",
          variant: "destructive"
        });
        return false;
      }

      if (!productId) {
        console.error('Product ID is required');
        toast({
          title: "Erro",
          description: "Selecione um produto primeiro",
          variant: "destructive"
        });
        return false;
      }

      console.log('Adding TikTok pixel:', { userId: user.id, productId, pixelData });

      const { data, error } = await supabase
        .from('tiktok_pixel_settings' as any)
        .insert({
          user_id: user.id,
          pixel_id: pixelData.pixelId,
          enabled: pixelData.enabled,
          events: pixelData.events,
          product_id: productId
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('TikTok pixel added successfully:', data);

      toast({
        title: "Pixel adicionado",
        description: "Pixel do TikTok foi adicionado com sucesso"
      });

      await fetchPixels();

      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'tiktok-pixel', productId }
      }));

      return true;
    } catch (error: any) {
      console.error('Error adding TikTok pixel:', error);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao adicionar pixel do TikTok",
        variant: "destructive"
      });
      return false;
    }
  };

  const updatePixel = async (pixelId: string, pixelData: Partial<TikTokPixel>) => {
    try {
      const { error } = await supabase
        .from('tiktok_pixel_settings' as any)
        .update({
          pixel_id: pixelData.pixelId,
          enabled: pixelData.enabled,
          events: pixelData.events
        })
        .eq('id', pixelId);

      if (error) throw error;

      toast({
        title: "Pixel atualizado",
        description: "Configurações do pixel foram atualizadas"
      });

      await fetchPixels();
      return true;
    } catch (error) {
      console.error('Error updating TikTok pixel:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar pixel",
        variant: "destructive"
      });
      return false;
    }
  };

  const deletePixel = async (pixelId: string) => {
    try {
      const { error } = await supabase
        .from('tiktok_pixel_settings' as any)
        .delete()
        .eq('id', pixelId);

      if (error) throw error;

      toast({
        title: "Pixel removido",
        description: "Pixel foi removido com sucesso"
      });

      await fetchPixels();
      return true;
    } catch (error) {
      console.error('Error deleting TikTok pixel:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover pixel",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPixels();
  }, [productId]);

  return {
    pixels,
    loading,
    addPixel,
    updatePixel,
    deletePixel,
    refetch: fetchPixels
  };
};
