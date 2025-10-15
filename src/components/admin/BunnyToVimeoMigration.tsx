import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Video, CloudUpload } from 'lucide-react';

export default function BunnyToVimeoMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🚀 Iniciando migração Bunny.net → Vimeo Pro...');

      const { data, error: invokeError } = await supabase.functions.invoke('migrate-bunny-to-vimeo', {
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
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5" />
          Migração Bunny.net → Vimeo Pro (Máxima Qualidade)
        </CardTitle>
        <CardDescription>
          Migrar vídeos do Bunny.net para Vimeo Pro preservando a melhor qualidade disponível
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            🎯 Sobre esta migração:
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Detecta a MAIOR resolução disponível no Bunny (2160p/1440p/1080p)</li>
            <li>Migra usando a melhor qualidade possível</li>
            <li>Configura domain whitelist automaticamente</li>
            <li>Vídeos ficam privados e protegidos</li>
            <li>Vimeo Pro: $9/mês fixo (vs Bunny: $100-500/mês)</li>
            <li>Bandwidth ilimitado + Sem marca d'água</li>
          </ul>
        </div>

        <Button 
          onClick={executeMigration} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrando vídeos (pode levar 30-60 min)...
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              Iniciar Migração Bunny → Vimeo Pro
            </>
          )}
        </Button>

        {loading && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              ⏳ Migração em andamento... 
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
              Os vídeos estão sendo transferidos do Bunny para o Vimeo na maior qualidade disponível
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
                <p className="font-semibold text-green-900 dark:text-green-100">
                  {result.message || 'Migração concluída!'}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-green-800 dark:text-green-200">
                ✅ Sucesso: <strong>{result.success || 0}</strong> vídeos
              </p>
              <p className="text-green-800 dark:text-green-200">
                ⏭️ Ignorados: <strong>{result.skipped || 0}</strong> vídeos
              </p>
              <p className="text-green-800 dark:text-green-200">
                ❌ Falhas: <strong>{result.failed || 0}</strong> vídeos
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-green-900 dark:text-green-100 mb-1">Erros:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((err: any, idx: number) => (
                      <li key={idx} className="text-red-800 dark:text-red-200 text-xs">
                        {err.lesson_title || `Aula ${err.lesson_id}`}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg space-y-2 text-xs">
          <p className="font-semibold text-yellow-900 dark:text-yellow-100">
            ⚠️ Importante:
          </p>
          <ul className="text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
            <li>Vídeos do Bunny NÃO serão deletados (backup seguro)</li>
            <li>Migração usa a MELHOR qualidade disponível (2160p/1440p/1080p)</li>
            <li>Processo pode levar 30-60 minutos dependendo do número de vídeos</li>
            <li>Você pode deletar do Bunny depois de confirmar que tudo funciona</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
