import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderBumpSettings {
  id?: string;
  enabled: boolean;
  title: string;
  description: string;
  position: string;
  bump_category: string;
  bump_type?: string;
  bump_product_id?: string;
  bump_product_name?: string;
  bump_product_price?: string;
  bump_product_image?: string;
  discount?: number;
  access_extension_type?: string;
  access_extension_value?: number;
  access_extension_description?: string;
  product_id?: string;
  bump_order?: number;
}

export const useOrderBumpSettings = (productId?: string) => {
  const [orderBumps, setOrderBumps] = useState<OrderBumpSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrderBumps = async (targetProductId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const finalProductId = targetProductId || productId;
      
      if (!finalProductId) {
        setOrderBumps([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', finalProductId)
        .order('bump_order', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const formattedBumps: OrderBumpSettings[] = (data || []).map(item => ({
        id: item.id,
        enabled: item.enabled,
        title: item.title,
        description: item.description,
        position: item.position,
        bump_category: item.bump_category || 'product_extra',
        bump_type: item.bump_type,
        bump_product_id: item.bump_product_id,
        bump_product_name: item.bump_product_name,
        bump_product_price: item.bump_product_price,
        bump_product_image: item.bump_product_image,
        discount: item.discount || 0,
        access_extension_type: item.access_extension_type,
        access_extension_value: item.access_extension_value,
        access_extension_description: item.access_extension_description,
        product_id: item.product_id,
        bump_order: item.bump_order || 1
      }));

      setOrderBumps(formattedBumps);
    } catch (error) {
      console.error('Error fetching order bump settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar order bumps",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveOrderBump = async (orderBumpData: Omit<OrderBumpSettings, 'id'>, editingId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verificar limite de 3 order bumps ativos por produto
      if (orderBumpData.enabled && !editingId) {
        const activeCount = orderBumps.filter(bump => bump.enabled && bump.id !== editingId).length;
        if (activeCount >= 3) {
          toast({
            title: "Limite atingido",
            description: "Você pode ter no máximo 3 order bumps ativos por produto",
            variant: "destructive"
          });
          return false;
        }
      }

      let targetProductId = orderBumpData.product_id || productId;
      if (!targetProductId) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (products && products.length > 0) {
          targetProductId = products[0].id;
        } else {
          throw new Error('No product found');
        }
      }

      const settingsData = {
        user_id: user.id,
        product_id: targetProductId,
        bump_category: orderBumpData.bump_category,
        enabled: orderBumpData.enabled,
        title: orderBumpData.title,
        description: orderBumpData.description,
        position: orderBumpData.position,
        bump_type: orderBumpData.bump_type || null,
        bump_product_id: orderBumpData.bump_product_id || null,
        bump_product_name: orderBumpData.bump_product_name || null,
        bump_product_price: orderBumpData.bump_product_price || null,
        bump_product_image: orderBumpData.bump_product_image || null,
        discount: orderBumpData.discount || 0,
        access_extension_type: orderBumpData.access_extension_type || null,
        access_extension_value: orderBumpData.access_extension_value || null,
        access_extension_description: orderBumpData.access_extension_description || null
      };

      let result;
      if (editingId) {
        // Update existing order bump
        result = await supabase
          .from('order_bump_settings')
          .update(settingsData)
          .eq('id', editingId)
          .select()
          .single();
      } else {
        // Create new order bump
        result = await supabase
          .from('order_bump_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: "Sucesso!",
        description: `Order bump ${editingId ? 'atualizado' : 'criado'} com sucesso`
      });

      // Refresh the order bumps list
      await fetchOrderBumps(targetProductId);

      // Disparar evento para atualizar a lista de integrações
      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'order-bump', productId: targetProductId }
      }));

      return true;
    } catch (error) {
      console.error('Error saving order bump:', error);
      toast({
        title: "Erro",
        description: `Falha ao ${editingId ? 'atualizar' : 'criar'} order bump`,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteOrderBump = async (orderBumpId: string) => {
    try {
      const { error } = await supabase
        .from('order_bump_settings')
        .delete()
        .eq('id', orderBumpId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Order bump deletado com sucesso"
      });

      // Refresh the list
      await fetchOrderBumps(productId);

      return true;
    } catch (error) {
      console.error('Error deleting order bump:', error);
      toast({
        title: "Erro",
        description: "Falha ao deletar order bump",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchOrderBumps(productId);
  }, [productId]);

  const refetchOrderBumps = (targetProductId?: string) => {
    setLoading(true);
    fetchOrderBumps(targetProductId || productId);
  };

  return {
    orderBumps,
    setOrderBumps,
    loading,
    saveOrderBump,
    deleteOrderBump,
    refetchOrderBumps,
    fetchOrderBumps
  };
};