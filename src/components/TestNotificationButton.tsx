import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export function TestNotificationButton() {
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado');
        return;
      }

      console.log('🧪 Enviando notificação de teste para:', user.id);

      const { data, error } = await supabase.functions.invoke('test-seller-notification', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success('Notificação de teste enviada! Aguarde alguns segundos...');
      console.log('✅ Resposta:', data);
    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTest}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Bell className="w-4 h-4" />
      {loading ? 'Enviando...' : 'Testar Notificação'}
    </Button>
  );
}
