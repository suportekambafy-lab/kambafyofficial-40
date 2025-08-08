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
      console.log('💰 [TESTE] Simulando notificação de venda...');
      console.log('💰 [TESTE] Client Sound Listener disponível?', typeof (window as any).notificarVenda);
      console.log('💰 [TESTE] Service Worker disponível?', 'serviceWorker' in navigator);
      
      // PRIMEIRO: Tentar via client-side diretamente
      if (typeof (window as any).notificarVenda === 'function') {
        console.log('💰 [TESTE] Chamando notificarVenda diretamente...');
        (window as any).notificarVenda('9.46 EUR', 'Curso Digital - Teste');
      } else {
        console.warn('💰 [TESTE] window.notificarVenda não está disponível');
      }
      
      // SEGUNDO: Tentar via edge function
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

      console.log('✅ [TESTE] Resposta da edge function:', data);
      
      if (error) {
        console.error('❌ [TESTE] Erro:', error);
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.success(`Notificação de venda simulada! Enviadas: ${data?.sent || 0}`);
      }
    } catch (err) {
      console.error('❌ [TESTE] Erro ao simular venda:', err);
      toast.error('Erro ao simular notificação de venda');
    } finally {
      setIsLoading(false);
    }
  };

  const testSoundDirectly = () => {
    console.log('🎵 [TESTE DIRETO] Testando som diretamente...');
    if (typeof (window as any).playNotificationSound === 'function') {
      (window as any).playNotificationSound();
    } else if (typeof (window as any).notificarVenda === 'function') {
      (window as any).notificarVenda('TESTE', 'Som Direto');
    } else {
      console.error('🎵 [TESTE DIRETO] Nenhuma função de som disponível');
      toast.error('Sistema de som não carregado');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={simulateSaleNotification} 
        disabled={isLoading}
        variant="default"
        className="text-sm"
      >
        {isLoading ? 'Simulando...' : '💰 Simular Venda'}
      </Button>
      <Button 
        onClick={testSoundDirectly} 
        variant="outline"
        className="text-sm"
      >
        🔊 Testar Som
      </Button>
    </div>
  );
};