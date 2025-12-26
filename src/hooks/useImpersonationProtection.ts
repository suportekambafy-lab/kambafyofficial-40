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
          
          // Calcular tempo restante
          const expiresAt = new Date(data.expiresAt).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

          // Se expirou, limpar sessão
          if (remaining <= 0) {
            handleSessionExpired();
            return null;
          }
          
          return { data, remaining };
        } catch (error) {
          console.error('Erro ao parsear dados de impersonation:', error);
          localStorage.removeItem('impersonation_data');
          return null;
        }
      }
      return null;
    };

    const sessionCheck = checkSession();
    if (sessionCheck) {
      setSession(sessionCheck.data);
      setTimeRemaining(sessionCheck.remaining);
    }

    // Atualizar contador a cada segundo
    const interval = setInterval(() => {
      const currentData = localStorage.getItem('impersonation_data');
      if (currentData) {
        try {
          const data = JSON.parse(currentData);
          const expiresAt = new Date(data.expiresAt).getTime();
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
        } catch (error) {
          console.error('Erro ao atualizar contador:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []); // ✅ Sem dependências para evitar loop infinito

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
      // Registrar término da sessão no banco (usando service role via função se necessário)
      const sessionId = session?.id;
      
      // Limpar dados de impersonation PRIMEIRO
      localStorage.removeItem('impersonation_data');
      setSession(null);
      setTimeRemaining(0);

      // Fazer signOut local do usuário impersonado
      await supabase.auth.signOut({ scope: 'local' });

      // Tentar restaurar a sessão Supabase do admin
      const backupSessionRaw = localStorage.getItem('admin_supabase_session_backup');
      if (backupSessionRaw) {
        try {
          const backup = JSON.parse(backupSessionRaw);
          console.log('🔁 Restaurando sessão Supabase do admin...');
          
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: backup.access_token,
            refresh_token: backup.refresh_token,
          });

          if (restoreError) {
            console.error('❌ Falha ao restaurar sessão Supabase:', restoreError);
          } else {
            console.log('✅ Sessão Supabase do admin restaurada');
            localStorage.removeItem('admin_supabase_session_backup');
            
            // Agora com a sessão admin restaurada, podemos atualizar o registro
            if (sessionId) {
              await supabase
                .from('admin_impersonation_sessions')
                .update({
                  is_active: false,
                  ended_at: new Date().toISOString()
                })
                .eq('id', sessionId);
            }
          }
        } catch (e) {
          console.error('❌ Erro ao restaurar sessão backup:', e);
        }
      }

      toast({
        title: 'Impersonation encerrado',
        description: 'Voltando ao painel de administração',
      });

      // Redirecionar para o painel admin
      window.location.href = '/admin/usuarios';
    } catch (error) {
      console.error('Erro ao sair do impersonation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao sair do modo impersonation',
        variant: 'destructive'
      });
      // Em caso de erro, ainda redirecionar
      window.location.href = '/admin/usuarios';
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