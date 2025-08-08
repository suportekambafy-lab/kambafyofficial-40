import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const SaleNotificationButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const simulateSaleNotification = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsLoading(true);
    try {
      console.log('💰 Simulando notificação de venda...');
      
      const { data, error } = await supabase.functions.invoke('send-web-push', {
        body: {
          user_id: user.id,
          title: '💰 Nova Venda Realizada!',
          body: 'Cliente: Victor Muabi • Valor: 9.46 EUR',
          url: '/sales',
          tag: 'kambafy-sale',
          data: { order_id: 'TEST123', product_id: 'test-product' }
        }
      });

      console.log('✅ Resposta da simulação:', data);
      
      if (error) {
        console.error('❌ Erro:', error);
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.success(`Notificação de venda simulada! Enviadas: ${data?.sent || 0}`);
      }
    } catch (err) {
      console.error('❌ Erro ao simular venda:', err);
      toast.error('Erro ao simular notificação de venda');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Button 
      onClick={simulateSaleNotification} 
      disabled={isLoading}
      variant="default"
      className="mt-2"
    >
      {isLoading ? 'Simulando...' : '💰 Simular Notificação de Venda'}
    </Button>
  );
};