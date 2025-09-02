import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from './useCustomToast';

interface AppyPayToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

export function useAppyPayToken() {
  const [token, setToken] = useState<AppyPayToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useCustomToast();

  const generateToken = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔑 Gerando token AppyPay...');
      
      const { data, error } = await supabase.functions.invoke('appypay-token');
      
      if (error) {
        console.error('❌ Erro ao gerar token:', error);
        toast({
          title: "Erro",
          message: "Erro ao gerar token de acesso AppyPay",
          variant: "error"
        });
        return null;
      }

      if (data?.success) {
        console.log('✅ Token AppyPay gerado com sucesso');
        const tokenData: AppyPayToken = {
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          expires_at: data.expires_at
        };
        
        setToken(tokenData);
        
        // Armazenar token no localStorage com expiração
        localStorage.setItem('appypay_token', JSON.stringify(tokenData));
        
        toast({
          title: "Sucesso",
          message: "Token de acesso AppyPay gerado com sucesso",
          variant: "success"
        });
        
        return tokenData;
      } else {
        console.error('❌ Resposta inválida:', data);
        toast({
          title: "Erro",
          message: data?.error || "Erro desconhecido ao gerar token",
          variant: "error"
        });
        return null;
      }
    } catch (error) {
      console.error('💥 Erro inesperado ao gerar token:', error);
      toast({
        title: "Erro",
        message: "Erro inesperado ao gerar token de acesso",
        variant: "error"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getValidToken = useCallback(async (): Promise<AppyPayToken | null> => {
    // Verificar se há token válido no estado
    if (token && token.expires_at > Date.now()) {
      console.log('✅ Usando token válido do estado');
      return token;
    }

    // Verificar se há token válido no localStorage
    const storedToken = localStorage.getItem('appypay_token');
    if (storedToken) {
      try {
        const parsedToken: AppyPayToken = JSON.parse(storedToken);
        if (parsedToken.expires_at > Date.now()) {
          console.log('✅ Usando token válido do localStorage');
          setToken(parsedToken);
          return parsedToken;
        } else {
          console.log('⏰ Token expirado, removendo do localStorage');
          localStorage.removeItem('appypay_token');
        }
      } catch (error) {
        console.error('❌ Erro ao parsear token do localStorage:', error);
        localStorage.removeItem('appypay_token');
      }
    }

    // Gerar novo token se não há válido
    console.log('🔄 Gerando novo token...');
    return await generateToken();
  }, [token, generateToken]);

  const clearToken = useCallback(() => {
    console.log('🧹 Limpando token AppyPay');
    setToken(null);
    localStorage.removeItem('appypay_token');
  }, []);

  const isTokenValid = useCallback(() => {
    return token && token.expires_at > Date.now();
  }, [token]);

  return {
    token,
    isLoading,
    generateToken,
    getValidToken,
    clearToken,
    isTokenValid
  };
}