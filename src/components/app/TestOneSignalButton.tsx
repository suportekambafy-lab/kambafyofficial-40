import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export const TestOneSignalButton = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleTestOneSignal = () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(function(OneSignal: any) {
      OneSignal.getUserId(async function(playerId: string | null) {
        if (!playerId) {
          toast({
            title: "❌ Erro",
            description: "Não consegui obter o Player ID do OneSignal.",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Player ID obtido",
          description: playerId,
        });

        try {
          // Usar o user_id do usuário logado, ou "TESTE_USER" se não estiver logado
          const userId = user?.id || "TESTE_USER";

          const { data, error } = await supabase.functions.invoke('save-onesignal-player-id', {
            body: {
              user_id_input: userId,
              player_id_input: playerId
            }
          });

          if (error) {
            toast({
              title: "❌ Erro ao salvar",
              description: error.message,
              variant: "destructive"
            });
            console.error('Erro:', error);
            return;
          }

          toast({
            title: "✅ Sucesso!",
            description: `Player ID salvo: ${JSON.stringify(data, null, 2)}`,
          });
          
          console.log('Resposta do Supabase:', data);
        } catch (err) {
          toast({
            title: "❌ Erro na requisição",
            description: err instanceof Error ? err.message : 'Erro desconhecido',
            variant: "destructive"
          });
          console.error('Erro na requisição:', err);
        }
      });
    });
  };

  return (
    <Button 
      onClick={handleTestOneSignal}
      variant="outline"
      className="w-full"
    >
      🧪 Testar Salvamento OneSignal
    </Button>
  );
};
