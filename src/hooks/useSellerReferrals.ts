import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SellerReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  reward_option: 'long_term' | 'short_term' | null;
  commission_rate: number | null;
  duration_months: number | null;
  first_sale_at: string | null;
  expires_at: string | null;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  fraud_check: Record<string, any>;
  created_at: string;
  updated_at: string;
  referred_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface ReferralCommission {
  id: string;
  referral_id: string;
  order_id: string;
  sale_net_amount: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'credited' | 'cancelled';
  created_at: string;
}

export interface ReferralStats {
  totalReferred: number;
  activeReferred: number;
  pendingReferred: number;
  expiredReferred: number;
  totalEarnings: number;
  earningsThisMonth: number;
  earningsByCurrency: Record<string, number>;
}

export function useSellerReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar código de indicação do usuário
  const { data: referralCode, isLoading: isLoadingCode } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      // Se não tem código, gerar um
      if (!data.referral_code) {
        const { data: newCode, error: rpcError } = await supabase
          .rpc('generate_referral_code', { user_name: data.full_name || 'USER' });
        
        if (rpcError) throw rpcError;
        
        // Salvar o código gerado
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referral_code: newCode })
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
        
        return newCode as string;
      }
      
      return data.referral_code;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // Buscar indicações feitas pelo usuário
  const { data: referrals, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['seller-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('seller_referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Buscar perfis dos indicados
      const referredIds = data.map(r => r.referred_id);
      if (referredIds.length === 0) return data as SellerReferral[];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', referredIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(referral => ({
        ...referral,
        referred_profile: profileMap.get(referral.referred_id) || null,
      })) as SellerReferral[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Buscar comissões de indicação
  const { data: commissions, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['referral-commissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Primeiro buscar IDs das indicações do usuário
      const { data: refs } = await supabase
        .from('seller_referrals')
        .select('id')
        .eq('referrer_id', user.id);
      
      if (!refs || refs.length === 0) return [];
      
      const refIds = refs.map(r => r.id);
      
      const { data, error } = await supabase
        .from('referral_commissions')
        .select('*')
        .in('referral_id', refIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReferralCommission[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  // Buscar quem indicou o usuário atual
  const { data: referredBy } = useQuery({
    queryKey: ['referred-by', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('seller_referrals')
        .select('referrer_id, referral_code')
        .eq('referred_id', user.id)
        .single();
      
      if (error || !data) return null;
      
      // Buscar nome do indicador
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', data.referrer_id)
        .single();
      
      return {
        referrerId: data.referrer_id,
        referrerName: profile?.full_name || 'Vendedor',
      };
    },
    enabled: !!user?.id,
  });

  // Calcular estatísticas
  const stats: ReferralStats = {
    totalReferred: referrals?.length || 0,
    activeReferred: referrals?.filter(r => r.status === 'active').length || 0,
    pendingReferred: referrals?.filter(r => r.status === 'pending').length || 0,
    expiredReferred: referrals?.filter(r => r.status === 'expired').length || 0,
    totalEarnings: commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    earningsThisMonth: commissions?.filter(c => {
      const date = new Date(c.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    earningsByCurrency: commissions?.reduce((acc, c) => {
      acc[c.currency] = (acc[c.currency] || 0) + Number(c.commission_amount);
      return acc;
    }, {} as Record<string, number>) || {},
  };

  // Mutation para escolher opção de recompensa
  const chooseRewardOption = useMutation({
    mutationFn: async ({ referralId, option }: { referralId: string; option: 'long_term' | 'short_term' }) => {
      const commission_rate = option === 'long_term' ? 0.015 : 0.02;
      const duration_months = option === 'long_term' ? 12 : 6;
      
      const { error } = await supabase
        .from('seller_referrals')
        .update({
          reward_option: option,
          commission_rate,
          duration_months,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referralId)
        .eq('referrer_id', user?.id)
        .eq('status', 'pending');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-referrals'] });
      toast({
        title: 'Opção escolhida!',
        description: 'A opção de recompensa foi definida com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível definir a opção de recompensa.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar código de indicação
  const updateReferralCode = useMutation({
    mutationFn: async (newCode: string) => {
      const code = newCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      if (code.length < 4 || code.length > 15) {
        throw new Error('O código deve ter entre 4 e 15 caracteres');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('user_id', user?.id);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Este código já está em uso');
        }
        throw error;
      }
      
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['referral-code'] });
      toast({
        title: 'Código atualizado!',
        description: `Seu novo código é: ${code}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o código.',
        variant: 'destructive',
      });
    },
  });

  return {
    referralCode,
    referrals,
    commissions,
    stats,
    referredBy,
    isLoading: isLoadingCode || isLoadingReferrals || isLoadingCommissions,
    chooseRewardOption,
    updateReferralCode,
  };
}
