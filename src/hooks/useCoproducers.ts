import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';

export interface Coproducer {
  id: string;
  product_id: string;
  owner_user_id: string;
  coproducer_user_id: string | null;
  coproducer_email: string;
  coproducer_name: string | null;
  commission_rate: number;
  duration_days: number;
  expires_at: string | null;
  canceled_at: string | null;
  canceled_by: 'owner' | 'coproducer' | null;
  status: 'pending' | 'accepted' | 'rejected' | 'removed';
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  commission_from_producer_sales: boolean;
  commission_from_affiliate_sales: boolean;
}

export interface CoproducerWithProduct extends Coproducer {
  products?: {
    id: string;
    name: string;
    cover: string | null;
    user_id: string;
  };
}

// Helper para verificar se co-produção está ativa
export const isCoproductionActive = (coproducer: Coproducer): boolean => {
  if (coproducer.status !== 'accepted') return false;
  if (coproducer.canceled_at) return false;
  if (coproducer.expires_at && new Date(coproducer.expires_at) < new Date()) return false;
  return true;
};

// Helper para calcular dias restantes
export const getDaysRemaining = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffTime = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export function useCoproducers(productId?: string) {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const queryClient = useQueryClient();

  // Buscar co-produtores de um produto específico
  const {
    data: coproducers = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['coproducers', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('coproducers')
        .select('*')
        .eq('product_id', productId)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coproducer[];
    },
    enabled: !!productId && !!user,
    staleTime: 30000,
  });

  // Calcular total de comissões (apenas de co-produtores ativos)
  const totalCommission = coproducers
    .filter(c => (c.status === 'accepted' && !c.canceled_at && (!c.expires_at || new Date(c.expires_at) > new Date())) || c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.commission_rate), 0);

  // Convidar co-produtor
  const inviteMutation = useMutation({
    mutationFn: async ({ 
      email, 
      commissionRate, 
      name,
      durationDays = 30,
      commissionFromProducerSales = true,
      commissionFromAffiliateSales = true
    }: { 
      email: string; 
      commissionRate: number;
      name?: string;
      durationDays?: number;
      commissionFromProducerSales?: boolean;
      commissionFromAffiliateSales?: boolean;
    }) => {
      if (!productId || !user) throw new Error('Produto ou usuário não encontrado');

      // Verificar se email já é co-produtor
      const existingCoproducer = coproducers.find(
        c => c.coproducer_email.toLowerCase() === email.toLowerCase() && 
             c.status !== 'removed' && 
             !c.canceled_at
      );
      if (existingCoproducer) {
        throw new Error('Este email já é co-produtor deste produto');
      }

      // Verificar se não está convidando a si mesmo
      if (user.email?.toLowerCase() === email.toLowerCase()) {
        throw new Error('Você não pode se convidar como co-produtor');
      }

      // Verificar limite de comissões (máximo 99%)
      if (totalCommission + commissionRate > 99) {
        throw new Error(`O total de comissões não pode ultrapassar 99%. Disponível: ${99 - totalCommission}%`);
      }

      // Buscar se o usuário já existe no sistema
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      const { data, error } = await supabase
        .from('coproducers')
        .insert({
          product_id: productId,
          owner_user_id: user.id,
          coproducer_user_id: existingUser?.id || null,
          coproducer_email: email.toLowerCase(),
          coproducer_name: name || existingUser?.full_name || null,
          commission_rate: commissionRate,
          duration_days: durationDays,
          status: 'pending',
          commission_from_producer_sales: commissionFromProducerSales,
          commission_from_affiliate_sales: commissionFromAffiliateSales
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este email já foi convidado para este produto');
        }
        throw error;
      }

      // Buscar dados do produto e do dono para enviar e-mail
      const { data: productData } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Enviar e-mail de convite
      try {
        await supabase.functions.invoke('send-coproducer-invite', {
          body: {
            coproducer_id: data.id,
            coproducer_email: email.toLowerCase(),
            coproducer_name: name || existingUser?.full_name || null,
            owner_name: ownerProfile?.full_name || 'Produtor',
            product_name: productData?.name || 'Produto',
            commission_rate: commissionRate,
            duration_days: durationDays
          }
        });
        console.log('[useCoproducers] Invitation email sent successfully');
      } catch (emailError) {
        console.error('[useCoproducers] Failed to send invitation email:', emailError);
        // Não falhar a operação se o e-mail não for enviado
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Convite enviado!',
        message: 'O co-produtor foi convidado e receberá um e-mail com o convite.',
        variant: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['coproducers', productId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao convidar',
        message: error.message,
        variant: 'error'
      });
    }
  });

  // Cancelar convite pendente (só dono pode fazer)
  const cancelInviteMutation = useMutation({
    mutationFn: async (coproducerId: string) => {
      const coproducer = coproducers.find(c => c.id === coproducerId);
      if (!coproducer) throw new Error('Co-produtor não encontrado');
      
      if (coproducer.status !== 'pending') {
        throw new Error('Só é possível cancelar convites pendentes');
      }

      const { error } = await supabase
        .from('coproducers')
        .update({ status: 'removed' })
        .eq('id', coproducerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Convite cancelado',
        message: 'O convite foi cancelado com sucesso.',
        variant: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['coproducers', productId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar',
        message: error.message,
        variant: 'error'
      });
    }
  });

  return {
    coproducers,
    isLoading,
    totalCommission,
    availableCommission: 99 - totalCommission,
    inviteCoproducer: inviteMutation.mutate,
    isInviting: inviteMutation.isPending,
    cancelInvite: cancelInviteMutation.mutate,
    isCanceling: cancelInviteMutation.isPending,
    refetch
  };
}

// Hook para buscar convites recebidos (onde sou co-produtor)
export function useMyCoproductions() {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const queryClient = useQueryClient();

  const {
    data: coproductions = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['my-coproductions', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from('coproducers')
        .select(`
          *,
          products:product_id (
            id,
            name,
            cover,
            user_id
          )
        `)
        .or(`coproducer_email.eq.${user.email.toLowerCase()},coproducer_user_id.eq.${user.id}`)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CoproducerWithProduct[];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // Convites pendentes
  const pendingInvites = coproductions.filter(c => c.status === 'pending');
  
  // Co-produções ativas (aceitas, não canceladas, não expiradas)
  const activeCoproductions = coproductions.filter(c => isCoproductionActive(c));
  
  // Co-produções expiradas ou canceladas
  const inactiveCoproductions = coproductions.filter(c => 
    c.status === 'accepted' && !isCoproductionActive(c)
  );

  // Responder convite
  const respondMutation = useMutation({
    mutationFn: async ({ 
      coproducerId, 
      accept 
    }: { 
      coproducerId: string; 
      accept: boolean;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const coproduction = coproductions.find(c => c.id === coproducerId);
      if (!coproduction) throw new Error('Convite não encontrado');

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (coproduction.duration_days * 24 * 60 * 60 * 1000));

      const { error } = await supabase
        .from('coproducers')
        .update({
          status: accept ? 'accepted' : 'rejected',
          coproducer_user_id: user.id,
          accepted_at: accept ? now.toISOString() : null,
          expires_at: accept ? expiresAt.toISOString() : null
        })
        .eq('id', coproducerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.accept ? 'Convite aceito!' : 'Convite rejeitado',
        message: variables.accept 
          ? 'Você agora é co-produtor deste produto.'
          : 'O convite foi rejeitado.',
        variant: variables.accept ? 'success' : 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['my-coproductions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        message: error.message,
        variant: 'error'
      });
    }
  });

  // Cancelar co-produção (só co-produtor pode fazer após aceitar)
  const cancelCoproductionMutation = useMutation({
    mutationFn: async (coproducerId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const coproduction = coproductions.find(c => c.id === coproducerId);
      if (!coproduction) throw new Error('Co-produção não encontrada');
      
      if (coproduction.status !== 'accepted') {
        throw new Error('Só é possível cancelar co-produções aceitas');
      }

      const { error } = await supabase
        .from('coproducers')
        .update({
          canceled_at: new Date().toISOString(),
          canceled_by: 'coproducer'
        })
        .eq('id', coproducerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Co-produção cancelada',
        message: 'Você não receberá mais comissões deste produto.',
        variant: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['my-coproductions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar',
        message: error.message,
        variant: 'error'
      });
    }
  });

  return {
    coproductions,
    pendingInvites,
    activeCoproductions,
    inactiveCoproductions,
    isLoading,
    respondToInvite: respondMutation.mutate,
    isResponding: respondMutation.isPending,
    cancelCoproduction: cancelCoproductionMutation.mutate,
    isCanceling: cancelCoproductionMutation.isPending,
    refetch
  };
}
