import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FacebookPixel {
  id?: string;
  pixelId: string;
  enabled: boolean;
}

export const useFacebookPixelList = (productId?: string) => {
  const [pixels, setPixels] = useState<FacebookPixel[]>([]);
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
        .from('facebook_pixel_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPixels((data || []).map(item => ({
        id: item.id,
        pixelId: item.pixel_id,
        enabled: item.enabled
      })));
    } catch (error) {
      console.error('Error fetching pixels:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar pixels",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPixel = async (pixelData: Omit<FacebookPixel, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('facebook_pixel_settings')
        .insert({
          user_id: user.id,
          pixel_id: pixelData.pixelId,
          enabled: pixelData.enabled,
          product_id: productId
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Pixel adicionado",
        description: "Pixel do Facebook foi adicionado com sucesso"
      });

      await fetchPixels();

      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'facebook-pixel', productId }
      }));

      return true;
    } catch (error) {
      console.error('Error adding pixel:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar pixel",
        variant: "destructive"
      });
      return false;
    }
  };

  const updatePixel = async (pixelId: string, pixelData: Partial<FacebookPixel>) => {
    try {
      const { error } = await supabase
        .from('facebook_pixel_settings')
        .update({
          pixel_id: pixelData.pixelId,
          enabled: pixelData.enabled
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
      console.error('Error updating pixel:', error);
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
        .from('facebook_pixel_settings')
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
      console.error('Error deleting pixel:', error);
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
