import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImpersonationSession {
  id: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  expiresAt: string;
  startedAt: string;
  readOnlyMode: boolean;
  durationMinutes: number;
}

interface ImpersonationProtectionResult {
  isImpersonating: boolean;
  session: ImpersonationSession | null;
  timeRemaining: number;
  exitImpersonation: () => Promise<void>;
  isReadOnly: boolean;
  canPerformAction: (action: string) => boolean;
}

export const useImpersonationProtection = (): ImpersonationProtectionResult => {
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se existe sessão de impersonation ativa
    const checkSession = () => {
      const impersonationData = localStorage.getItem('impersonation_data');
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          setSession(data);
          
          // Calcular tempo restante
          const expiresAt = new Date(data.expiresAt).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setTimeRemaining(remaining);

          // Se expirou, limpar sessão
          if (remaining <= 0) {
            handleSessionExpired();
          }
        } catch (error) {
          console.error('Erro ao parsear dados de impersonation:', error);
          localStorage.removeItem('impersonation_data');
        }
      }
    };

    checkSession();

    // Atualizar contador a cada segundo
    const interval = setInterval(() => {
      if (session) {
        const expiresAt = new Date(session.expiresAt).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeRemaining(remaining);

        // Avisos de tempo
        if (remaining === 300) { // 5 minutos
          toast({
            title: '⏰ Sessão de Impersonation',
            description: 'Restam 5 minutos antes da sessão expirar',
            variant: 'default'
          });
        } else if (remaining === 60) { // 1 minuto
          toast({
            title: '⚠️ Sessão Expirando',
            description: 'Restam 60 segundos antes da sessão expirar',
            variant: 'destructive'
          });
        } else if (remaining === 0) {
          handleSessionExpired();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleSessionExpired = async () => {
    toast({
      title: '⏰ Sessão Expirada',
      description: 'A sessão de impersonation expirou por segurança',
      variant: 'destructive'
    });

    await exitImpersonation();
  };

  const exitImpersonation = useCallback(async () => {
    try {
      // Registrar término da sessão
      if (session?.id) {
        await supabase
          .from('admin_impersonation_sessions')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', session.id);
      }

      // Limpar dados locais
      localStorage.removeItem('impersonation_data');
      setSession(null);
      setTimeRemaining(0);

      // Logout do usuário impersonado
      await supabase.auth.signOut();

      // Redirecionar para login admin
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Erro ao sair do impersonation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao sair do modo impersonation',
        variant: 'destructive'
      });
    }
  }, [session, toast]);

  const canPerformAction = useCallback((action: string): boolean => {
    if (!session) return true; // Se não está em impersonation, pode tudo

    // Em modo somente leitura, bloquear ações de escrita
    if (session.readOnlyMode) {
      const writeActions = [
        'create_product',
        'update_product',
        'delete_product',
        'create_transaction',
        'update_balance',
        'withdraw',
        'upload_file'
      ];

      if (writeActions.includes(action)) {
        toast({
          title: '🚫 Ação Bloqueada',
          description: 'Esta ação não é permitida em modo somente-leitura durante impersonation',
          variant: 'destructive'
        });
        return false;
      }
    }

    return true;
  }, [session, toast]);

  return {
    isImpersonating: !!session,
    session,
    timeRemaining,
    exitImpersonation,
    isReadOnly: session?.readOnlyMode ?? false,
    canPerformAction
  };
};