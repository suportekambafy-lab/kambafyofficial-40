import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function BunnyMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const executeMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const { data, error: invokeError } = await supabase.functions.invoke('migrate-back-to-bunny');

      if (invokeError) {
        throw invokeError;
      }

      setResult(data);
      
      if (data.success) {
        toast({
          title: "Migração concluída",
          description: data.message,
        });
      } else {
        toast({
          title: "Migração concluída com erros",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Erro na migração:', err);
      setError(err.message);
      toast({
        title: "Erro na migração",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          Migrar de volta para Bunny.net
        </CardTitle>
        <CardDescription>
          Migra os vídeos de volta para Bunny.net usando os IDs originais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Esta migração irá:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Buscar todas as lições que têm vídeos</li>
            <li>Verificar se os vídeos ainda existem no Bunny.net</li>
            <li>Reconstruir os URLs corretos (embed e HLS)</li>
            <li>Atualizar o banco de dados com os novos URLs</li>
            <li>Pular vídeos que não existem mais no Bunny (precisam re-upload)</li>
          </ul>
        </div>

        <Button
          onClick={executeMigration}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrando...
            </>
          ) : (
            'Iniciar Migração para Bunny'
          )}
        </Button>

        {loading && (
          <div className="text-sm text-muted-foreground text-center">
            Processando vídeos... isso pode levar alguns minutos.
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            <p className="font-medium">Erro na migração:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-medium">Resultado da Migração:</h3>
              
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Sucesso: {result.results.success}/{result.results.total}</span>
                </div>
                
                {result.results.skipped > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Pulados (precisam re-upload): {result.results.skipped}/{result.results.total}</span>
                  </div>
                )}
                
                {result.results.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Falhas: {result.results.failed}/{result.results.total}</span>
                  </div>
                )}
              </div>
            </div>

            {result.results.errors?.length > 0 && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">Erros detalhados:</h4>
                <ul className="space-y-1 text-sm text-destructive">
                  {result.results.errors.map((err: any, idx: number) => (
                    <li key={idx}>
                      <strong>{err.title}:</strong> {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
          <p className="font-medium">⚠️ Importante:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
            <li>Vídeos que não existem mais no Bunny serão pulados e precisarão de re-upload manual</li>
            <li>Os vídeos não são copiados - apenas os URLs são atualizados</li>
            <li>Esta operação é segura e pode ser executada múltiplas vezes</li>
            <li>Verifique os logs da edge function para mais detalhes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
