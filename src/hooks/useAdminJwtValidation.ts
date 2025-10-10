import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from './useAdminAuth';

/**
 * Hook para validar JWT do admin no carregamento da sessão
 * Se o JWT for inválido ou expirado, faz logout automático
 */
export const useAdminJwtValidation = () => {
  const { admin, logout } = useAdminAuth();

  useEffect(() => {
    const validateJwt = async () => {
      if (!admin) return;

      const adminJwt = localStorage.getItem('admin_jwt');
      
      // Se não tem JWT mas tem admin, algo está errado
      if (!adminJwt) {
        console.warn('⚠️ Admin logado mas sem JWT - fazendo logout');
        await logout();
        return;
      }

      try {
        // Validar JWT no backend
        const { data, error } = await supabase.rpc('verify_admin_jwt', {
          jwt_token: adminJwt
        });

        if (error || !data?.[0]?.is_valid) {
          console.error('❌ JWT inválido ou expirado - fazendo logout automático');
          await logout();
          return;
        }

        console.log('✅ JWT validado com sucesso:', data[0].email);
      } catch (error) {
        console.error('❌ Erro ao validar JWT:', error);
        await logout();
      }
    };

    validateJwt();
  }, [admin, logout]);
};
