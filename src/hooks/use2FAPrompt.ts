
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { use2FA } from '@/hooks/use2FA';
import { supabase } from '@/integrations/supabase/client';

export const use2FAPrompt = () => {
  const { user } = useAuth();
  const { settings } = use2FA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  const checkIfShouldPrompt = async () => {
    if (!user || settings?.enabled) return;

    try {
      // Verificar se o usuário já teve vendas
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (ordersError) throw ordersError;

      // Verificar há quanto tempo a conta foi criada
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);

      // Mostrar prompt se:
      // 1. Teve primeira venda, ou
      // 2. Conta tem mais de 7 dias
      // 3. E ainda não ativou 2FA
      const hasSales = orders && orders.length > 0;
      const accountOldEnough = daysSinceCreation > 7;

      if (hasSales || accountOldEnough) {
        setIsFirstTime(daysSinceCreation <= 1); // Primeira vez se conta é muito nova
        setShowPrompt(true);
      }

    } catch (error) {
      console.error('Error checking 2FA prompt conditions:', error);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Salvar no localStorage para não mostrar novamente hoje
    localStorage.setItem(`2fa_prompt_dismissed_${user?.id}`, new Date().toDateString());
  };

  const checkDismissedToday = () => {
    if (!user) return false;
    const dismissed = localStorage.getItem(`2fa_prompt_dismissed_${user.id}`);
    return dismissed === new Date().toDateString();
  };

  useEffect(() => {
    if (user && !settings?.enabled && !checkDismissedToday()) {
      // Aguardar um pouco antes de verificar para permitir que as configurações carreguem
      const timer = setTimeout(checkIfShouldPrompt, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, settings]);

  return {
    showPrompt,
    isFirstTime,
    dismissPrompt,
    forceShow: () => setShowPrompt(true),
  };
};
