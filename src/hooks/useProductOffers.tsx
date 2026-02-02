import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductOffer {
  id?: string;
  product_id: string;
  name: string;
  price: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export function useProductOffers(productId: string | undefined) {
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOffers = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_offers')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setOffers((data as ProductOffer[]) || []);
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      toast.error('Erro ao carregar ofertas');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const addOffer = async (offer: Omit<ProductOffer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('product_offers')
        .insert({
          ...offer,
          sort_order: offers.length
        })
        .select()
        .single();

      if (error) throw error;
      
      setOffers(prev => [...prev, data as ProductOffer]);
      toast.success('Oferta adicionada!');
      return data as ProductOffer;
    } catch (error: any) {
      console.error('Error adding offer:', error);
      toast.error('Erro ao adicionar oferta');
      return null;
    }
  };

  const updateOffer = async (offerId: string, updates: Partial<ProductOffer>) => {
    try {
      const { error } = await supabase
        .from('product_offers')
        .update(updates)
        .eq('id', offerId);

      if (error) throw error;
      
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, ...updates } : o));
      toast.success('Oferta atualizada!');
      return true;
    } catch (error: any) {
      console.error('Error updating offer:', error);
      toast.error('Erro ao atualizar oferta');
      return false;
    }
  };

  const deleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('product_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      
      setOffers(prev => prev.filter(o => o.id !== offerId));
      toast.success('Oferta removida!');
      return true;
    } catch (error: any) {
      console.error('Error deleting offer:', error);
      toast.error('Erro ao remover oferta');
      return false;
    }
  };

  const toggleOfferActive = async (offerId: string, isActive: boolean) => {
    return updateOffer(offerId, { is_active: isActive });
  };

  return {
    offers,
    loading,
    fetchOffers,
    addOffer,
    updateOffer,
    deleteOffer,
    toggleOfferActive
  };
}
