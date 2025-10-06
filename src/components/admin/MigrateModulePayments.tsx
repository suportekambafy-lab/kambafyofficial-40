import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function MigrateModulePayments() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-module-payments');
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Migrar Pagamentos de Módulos
        </CardTitle>
        <CardDescription>
          Conceder acesso aos alunos que já pagaram por módulos antes da implementação do novo sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta operação irá verificar todos os pagamentos completados e criar registros de acesso individual
            para alunos que já pagaram mas ainda não têm acesso registrado na nova tabela.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runMigration}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Executando migração...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Executar Migração
            </>
          )}
        </Button>

        {result && (
          <Card className="bg-muted">
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
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
