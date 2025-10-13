import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function VideoMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🚀 Iniciando migração de vídeos do Bunny Stream para Cloudflare Stream...');

      const { data, error: invokeError } = await supabase.functions.invoke('migrate-videos-to-stream', {
        body: {}
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      console.log('✅ Migração concluída:', data);
      setResult(data);
    } catch (err: any) {
      console.error('❌ Erro na migração:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Migração de Vídeos</CardTitle>
        <CardDescription>
          Migrar vídeos do Bunny Stream para Cloudflare Stream
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={executeMigration} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrando vídeos...
            </>
          ) : (
            'Executar Migração'
          )}
        </Button>

        {loading && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              ⏳ Migração em andamento... Isso pode levar 10-15 minutos.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg flex items-start gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Erro na migração</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Migração concluída!</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-green-800 dark:text-green-200">
                ✅ Sucesso: <strong>{result.success || 0}</strong> vídeos
              </p>
              <p className="text-green-800 dark:text-green-200">
                ❌ Falhas: <strong>{result.failed || 0}</strong> vídeos
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-green-900 dark:text-green-100 mb-1">Erros:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((err: any, idx: number) => (
                      <li key={idx} className="text-red-800 dark:text-red-200">
                        Aula {err.lesson_id}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
