import { useState, useCallback } from 'react';
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
  status: 'pending' | 'accepted' | 'rejected' | 'removed';
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoproducerWithProduct extends Coproducer {
  products?: {
    id: string;
    name: string;
    cover: string | null;
  };
}

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

  // Calcular total de comissões
  const totalCommission = coproducers
    .filter(c => c.status === 'accepted' || c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.commission_rate), 0);

  // Convidar co-produtor
  const inviteMutation = useMutation({
    mutationFn: async ({ 
      email, 
      commissionRate, 
      name 
    }: { 
      email: string; 
      commissionRate: number;
      name?: string;
    }) => {
      if (!productId || !user) throw new Error('Produto ou usuário não encontrado');

      // Verificar se email já é co-produtor
      const existingCoproducer = coproducers.find(
        c => c.coproducer_email.toLowerCase() === email.toLowerCase() && c.status !== 'removed'
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
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este email já foi convidado para este produto');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Convite enviado!',
        message: 'O co-produtor foi convidado com sucesso.',
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

  // Remover co-produtor
  const removeMutation = useMutation({
    mutationFn: async (coproducerId: string) => {
      const { error } = await supabase
        .from('coproducers')
        .update({ status: 'removed' })
        .eq('id', coproducerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Co-produtor removido',
        message: 'O co-produtor foi removido com sucesso.',
        variant: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['coproducers', productId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover',
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
    removeCoproducer: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
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
            cover
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
  
  // Co-produções ativas
  const activeCoproductions = coproductions.filter(c => c.status === 'accepted');

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

      const { error } = await supabase
        .from('coproducers')
        .update({
          status: accept ? 'accepted' : 'rejected',
          coproducer_user_id: user.id,
          accepted_at: accept ? new Date().toISOString() : null
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

  return {
    coproductions,
    pendingInvites,
    activeCoproductions,
    isLoading,
    respondToInvite: respondMutation.mutate,
    isResponding: respondMutation.isPending,
    refetch
  };
}
