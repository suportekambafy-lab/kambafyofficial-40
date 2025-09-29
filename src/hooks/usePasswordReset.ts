import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePasswordReset = () => {
  const [isLoading, setIsLoading] = useState(false);

  const resetPassword = async (email: string, memberAreaId: string): Promise<boolean> => {
    if (!email.trim() || !memberAreaId) {
      toast({
        title: "Erro",
        description: "Email e ID da área de membros são obrigatórios",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('member-area-reset-password', {
        body: {
          studentEmail: email.trim(),
          memberAreaId: memberAreaId
        }
      });

      if (error) {
        console.error('Erro ao resetar senha:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao processar solicitação",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Nova senha enviada para o seu email!",
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