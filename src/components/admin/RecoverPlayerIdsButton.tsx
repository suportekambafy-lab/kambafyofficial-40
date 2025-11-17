import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function RecoverPlayerIdsButton() {
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [stats, setStats] = useState<{ total: number; withPlayerId: number; withoutPlayerId: number } | null>(null);

  const fetchStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: withPlayerIdCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('onesignal_player_id', 'is', null);

      setStats({
        total: totalCount || 0,
        withPlayerId: withPlayerIdCount || 0,
        withoutPlayerId: (totalCount || 0) - (withPlayerIdCount || 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const recoverPlayerIds = async () => {
    setIsRecovering(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('recover-missing-player-ids', {
        body: { batch_size: 100 }
      });

      if (error) {
        toast({
          title: '❌ Erro na recuperação',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      setResults(data.results);
      
      toast({
        title: '✅ Recuperação concluída!',
        description: `Processados: ${data.results.total_processed} | Recuperados: ${data.results.recovered} | Não encontrados: ${data.results.not_found}`,
      });

      // Atualizar estatísticas
      await fetchStats();
    } catch (error: any) {
      console.error('Error recovering Player IDs:', error);
      toast({
        title: '❌ Erro',
        description: error.message || 'Erro ao recuperar Player IDs',
        variant: 'destructive'
      });
    } finally {
      setIsRecovering(false);
    }
  };

  // Carregar estatísticas ao montar
  useState(() => {
    fetchStats();
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recuperar Player IDs do OneSignal</CardTitle>
            <CardDescription>
              Sincronize Player IDs ausentes buscando na API do OneSignal
            </CardDescription>
          </div>
          <RefreshCw className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">Com Player ID</p>
              </div>
              <p className="text-2xl font-bold text-green-500">{stats.withPlayerId}</p>
            </div>
            
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">Sem Player ID</p>
              </div>
              <p className="text-2xl font-bold text-orange-500">{stats.withoutPlayerId}</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {results && (
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h4 className="font-semibold text-sm mb-3">Resultados da Última Execução</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processados:</span>
                <Badge variant="secondary">{results.total_processed}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-500">Recuperados:</span>
                <Badge className="bg-green-500">{results.recovered}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-500">Não encontrados:</span>
                <Badge className="bg-orange-500">{results.not_found}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive">Erros:</span>
                <Badge variant="destructive">{results.errors}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Ação */}
        <div className="space-y-2">
          <Button 
            onClick={recoverPlayerIds}
            disabled={isRecovering}
            className="w-full"
            size="lg"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recuperando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recuperar Player IDs (Lote de 100)
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Este processo busca na API do OneSignal por usuários que têm external_user_id registrado
          </p>
        </div>
      </CardContent>
    </Card>
  );
}