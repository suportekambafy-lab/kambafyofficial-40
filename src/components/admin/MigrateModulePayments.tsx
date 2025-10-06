import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
export function MigrateModulePayments() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCleanupLoading, setIsCleanupLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const runMigration = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('migrate-module-payments');
      if (error) {
        console.error('❌ Migration error:', error);
        toast.error('Erro na migração', {
          description: error.message
        });
        return;
      }
      console.log('✅ Migration result:', data);
      setResult(data);
      if (data.success) {
        toast.success('Migração concluída!', {
          description: `${data.migrated} acessos concedidos, ${data.skipped} já existiam`
        });
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error('Erro ao executar migração', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  const runCleanup = async () => {
    setIsCleanupLoading(true);
    setCleanupResult(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('cleanup-invalid-module-access');
      if (error) {
        console.error('❌ Cleanup error:', error);
        toast.error('Erro na limpeza', {
          description: error.message
        });
        return;
      }
      console.log('✅ Cleanup result:', data);
      setCleanupResult(data);
      if (data.success) {
        toast.success('Limpeza concluída!', {
          description: `${data.total_removed} acessos inválidos removidos`
        });
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error('Erro ao executar limpeza', {
        description: error.message
      });
    } finally {
      setIsCleanupLoading(false);
    }
  };
  return <Card>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta operação irá verificar todos os pagamentos completados e criar registros de acesso individual
            para alunos que já pagaram mas ainda não têm acesso registrado na nova tabela.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={runMigration} disabled={isLoading || isCleanupLoading} className="w-full" size="lg">
            {isLoading ? <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Executando migração...
              </> : <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Executar Migração
              </>}
          </Button>

          <Button onClick={runCleanup} disabled={isLoading || isCleanupLoading} variant="destructive" className="w-full" size="lg">
            {isCleanupLoading ? <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Limpando acessos...
              </> : <>
                <AlertCircle className="h-4 w-4 mr-2" />
                🧹 Limpar Acessos Inválidos
              </>}
          </Button>
        </div>

        {result && <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Resultado da Migração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total de Pagamentos</p>
                  <p className="text-2xl font-bold">{result.total_payments}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Acessos Concedidos</p>
                  <p className="text-2xl font-bold text-green-500">{result.migrated}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Já Existiam</p>
                  <p className="text-2xl font-bold text-blue-500">{result.skipped}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-500">{result.errors}</p>
                </div>
              </div>
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>}

        {cleanupResult && <Card className="bg-muted border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Resultado da Limpeza
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Verificados</p>
                  <p className="text-2xl font-bold">{cleanupResult.total_checked}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Acessos Removidos</p>
                  <p className="text-2xl font-bold text-destructive">{cleanupResult.total_removed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Acessos Válidos</p>
                  <p className="text-2xl font-bold text-green-500">{cleanupResult.total_valid}</p>
                </div>
              </div>
              
              {cleanupResult.breakdown && <div className="mt-4 p-3 bg-background rounded-lg text-xs space-y-1">
                  <p className="font-semibold mb-2">Detalhes da Limpeza:</p>
                  <p>• Sem payment_id: <span className="font-bold">{cleanupResult.breakdown.removed_no_payment}</span></p>
                  <p>• Pagamento inválido: <span className="font-bold">{cleanupResult.breakdown.removed_invalid_payment}</span></p>
                  <p>• Módulo errado: <span className="font-bold">{cleanupResult.breakdown.removed_wrong_module}</span></p>
                  <p>• Pagamento incompleto: <span className="font-bold">{cleanupResult.breakdown.removed_not_completed}</span></p>
                </div>}

              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {cleanupResult.message}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>}
      </CardContent>
    </Card>;
}