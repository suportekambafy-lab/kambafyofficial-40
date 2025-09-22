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
}

export const useOrderBumpSettings = (productId?: string, category?: string) => {
  const [settings, setSettings] = useState<OrderBumpSettings>({
    enabled: false,
    title: '',
    description: '',
    position: 'after_payment_method',
    bump_category: category || 'product_extra',
    product_id: productId || ''
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async (targetProductId?: string, targetCategory?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Sempre buscar por produto específico se fornecido
      const finalProductId = targetProductId || productId;
      const finalCategory = targetCategory || category;
      
      if (!finalProductId || !finalCategory) {
        // Se não há produto específico ou categoria, resetar configurações
        setSettings({
          enabled: false,
          title: '',
          description: '',
          position: 'after_payment_method',
          bump_category: finalCategory || 'product_extra',
          product_id: finalProductId || ''
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', finalProductId)
        .eq('bump_category', finalCategory)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          enabled: data.enabled,
          title: data.title,
          description: data.description,
          position: data.position,
          bump_category: data.bump_category,
          bump_type: data.bump_type,
          bump_product_id: data.bump_product_id,
          bump_product_name: data.bump_product_name,
          bump_product_price: data.bump_product_price,
          bump_product_image: data.bump_product_image,
          discount: data.discount,
          access_extension_type: data.access_extension_type,
          access_extension_value: data.access_extension_value,
          access_extension_description: data.access_extension_description,
          product_id: data.product_id
        });
      } else {
        // Reset settings se não encontrar dados
        setSettings({
          enabled: false,
          title: '',
          description: '',
          position: 'after_payment_method',
          bump_category: finalCategory,
          product_id: finalProductId
        });
      }
    } catch (error) {
      console.error('Error fetching order bump settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Omit<OrderBumpSettings, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Usar o productId fornecido ou o padrão
      let targetProductId = newSettings.product_id || productId;
      if (!targetProductId) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (products && products.length > 0) {
          targetProductId = products[0].id;
        }
      }

      const settingsData = {
        user_id: user.id,
        product_id: targetProductId,
        bump_category: newSettings.bump_category,
        enabled: newSettings.enabled,
        title: newSettings.title,
        description: newSettings.description,
        position: newSettings.position,
        bump_type: newSettings.bump_type || null,
        bump_product_id: newSettings.bump_product_id || null,
        bump_product_name: newSettings.bump_product_name || null,
        bump_product_price: newSettings.bump_product_price || null,
        bump_product_image: newSettings.bump_product_image || null,
        discount: newSettings.discount || 0,
        access_extension_type: newSettings.access_extension_type || null,
        access_extension_value: newSettings.access_extension_value || null,
        access_extension_description: newSettings.access_extension_description || null
      };

      console.log('Saving order bump settings for product:', targetProductId, settingsData);

      let result;
      // Verificar se existe um order bump já carregado E se é para o mesmo produto e categoria
      if (settings.id && settings.product_id === targetProductId && settings.bump_category === newSettings.bump_category) {
        // Update existing order bump for the same product and category
        result = await supabase
          .from('order_bump_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // Check if order bump already exists for this product and category
        const { data: existingOrderBump } = await supabase
          .from('order_bump_settings')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', targetProductId)
          .eq('bump_category', newSettings.bump_category)
          .maybeSingle();

        if (existingOrderBump) {
          // Update existing order bump for this product and category
          result = await supabase
            .from('order_bump_settings')
            .update(settingsData)
            .eq('id', existingOrderBump.id)
            .select()
            .single();
        } else {
          // Create new order bump for this product and category
          result = await supabase
            .from('order_bump_settings')
            .insert(settingsData)
            .select()
            .single();
        }
      }

      if (result.error) throw result.error;

      console.log('Order bump settings saved successfully:', result.data);

      setSettings({
        id: result.data.id,
        ...newSettings,
        product_id: targetProductId
      });

      toast({
        title: "Order bump salvo",
        description: "Configurações do order bump foram salvas com sucesso"
      });

      // Disparar evento para atualizar a lista de integrações
      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'order-bump', productId: targetProductId }
      }));

      return true;
    } catch (error) {
      console.error('Error saving order bump settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações do order bump",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings(productId, category);
  }, [productId, category]);

  const refetchSettings = (targetProductId?: string, targetCategory?: string) => {
    setLoading(true);
    fetchSettings(targetProductId || productId, targetCategory || category);
  };

  return {
    settings,
    setSettings,
    loading,
    saveSettings,
    refetchSettings
  };
};