import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FacebookApi {
  id?: string;
  accessToken: string;
  enabled: boolean;
}

export const useFacebookApiList = (productId?: string) => {
  const [apis, setApis] = useState<FacebookApi[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !productId) {
        setApis([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('facebook_api_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setApis((data || []).map(item => ({
        id: item.id,
        accessToken: item.access_token,
        enabled: item.enabled
      })));
    } catch (error) {
      console.error('Error fetching APIs:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar APIs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addApi = async (apiData: Omit<FacebookApi, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('facebook_api_settings')
        .insert({
          user_id: user.id,
          access_token: apiData.accessToken,
          app_id: '',
          app_secret: '',
          enabled: apiData.enabled,
          product_id: productId
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "API adicionada",
        description: "API de Conversões foi adicionada com sucesso"
      });

      await fetchApis();

      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'facebook-api', productId }
      }));

      return true;
    } catch (error) {
      console.error('Error adding API:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar API",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateApi = async (apiId: string, apiData: Partial<FacebookApi>) => {
    try {
      const { error } = await supabase
        .from('facebook_api_settings')
        .update({
          access_token: apiData.accessToken,
          enabled: apiData.enabled
        })
        .eq('id', apiId);

      if (error) throw error;

      toast({
        title: "API atualizada",
        description: "Configurações da API foram atualizadas"
      });

      await fetchApis();
      return true;
    } catch (error) {
      console.error('Error updating API:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar API",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteApi = async (apiId: string) => {
    try {
      const { error } = await supabase
        .from('facebook_api_settings')
        .delete()
        .eq('id', apiId);

      if (error) throw error;

      toast({
        title: "API removida",
        description: "API foi removida com sucesso"
      });

      await fetchApis();
      return true;
    } catch (error) {
      console.error('Error deleting API:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover API",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchApis();
  }, [productId]);

  return {
    apis,
    loading,
    addApi,
    updateApi,
    deleteApi,
    refetch: fetchApis
  };
};
