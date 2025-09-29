import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePasswordReset = () => {
  const [isLoading, setIsLoading] = useState(false);

  const resetPassword = async (email: string, memberAreaId: string, newPassword: string): Promise<boolean> => {
    if (!email.trim() || !memberAreaId || !newPassword.trim()) {
      toast({
        title: "Erro",
        description: "Email, ID da área de membros e nova senha são obrigatórios",
        variant: "destructive",
      });
      return false;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('member-area-reset-password', {
        body: {
          studentEmail: email.trim(),
          memberAreaId: memberAreaId,
          newPassword: newPassword.trim()
        }
      });

      if (error) {
        console.error('Erro ao definir nova senha:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao processar solicitação",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Nova senha definida com sucesso! Agora você pode fazer login.",
        variant: "default",
      });

      return true;
      
    } catch (error: any) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao processar solicitação",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    resetPassword,
    isLoading
  };
};