import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const PushTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const testPushNotification = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔔 Testando push notification...');
      
      const { data, error } = await supabase.functions.invoke('send-web-push', {
        body: {
          user_id: user.id,
          title: '🎉 Teste de Notificação',
          body: 'Esta é uma notificação de teste do Kambafy!',
          url: '/',
          tag: 'test-notification'
        }
      });

      console.log('✅ Resposta:', data);
      
      if (error) {
        console.error('❌ Erro:', error);
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.success(`Notificação enviada! Enviadas: ${data?.sent || 0}`);
      }
    } catch (err) {
      console.error('❌ Erro ao testar push:', err);
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Button 
      onClick={testPushNotification} 
      disabled={isLoading}
      variant="outline"
      className="mt-4"
    >
      {isLoading ? 'Enviando...' : '🔔 Testar Push Notification'}
    </Button>
  );
};