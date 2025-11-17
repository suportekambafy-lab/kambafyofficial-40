import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function TestNotificationButton() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: '❌ Erro',
          description: 'Você precisa estar logado',
          variant: 'destructive'
        });
        return;
      }

      // Chamar a edge function de teste
      const { data, error } = await supabase.functions.invoke('test-seller-notification', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Error sending test notification:', error);
        toast({
          title: '❌ Erro ao enviar',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      console.log('Test notification sent:', data);
      
      toast({
        title: '✅ Notificação de teste enviada!',
        description: 'Verifique se recebeu a notificação push em alguns segundos.',
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: '❌ Erro',
        description: error.message || 'Erro ao enviar notificação de teste',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      onClick={sendTestNotification}
      disabled={isSending}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isSending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando...
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Testar Notificação
        </>
      )}
    </Button>
  );
}