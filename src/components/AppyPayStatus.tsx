import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export function AppyPayStatus() {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useCustomToast();

  const runTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Executando teste AppyPay...');
      
      const { data, error } = await supabase.functions.invoke('appypay-test');
      
      if (error) {
        console.error('❌ Erro no teste:', error);
        toast({
          title: 'Erro',
          message: 'Erro ao executar teste AppyPay',
          variant: 'error'
        });
        return;
      }

      console.log('✅ Teste executado:', data);
      setTestResults(data);
      
      toast({
        title: 'Teste concluído',
        message: 'Teste AppyPay executado com sucesso',
        variant: 'success'
      });

    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      toast({
        title: 'Erro',
        message: 'Erro inesperado no teste',
        variant: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status >= 400 && status < 500) return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
    if (status >= 400 && status < 500) return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Aviso</Badge>;
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Status AppyPay</h2>
            <p className="text-muted-foreground">
              Verifique a configuração da integração AppyPay
            </p>
          </div>
          <Button 
            onClick={runTest} 
            disabled={testing}
            className="min-w-[120px]"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              'Executar Teste'
            )}
          </Button>
        </div>

        {testResults && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Variáveis de Ambiente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>Client ID: {testResults.environment?.clientId || 'Indefinido'}</div>
                <div>Client Secret: {testResults.environment?.clientSecret || 'Indefinido'}</div>
                <div>Auth Base URL: {testResults.environment?.authBaseUrl || 'Indefinido'}</div>
                <div>API Base URL: {testResults.environment?.apiBaseUrl || 'Indefinido'}</div>
                <div>Base URL: {testResults.environment?.baseUrl || 'Indefinido'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Testes de Conectividade</h3>
              
              {testResults.testResults?.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {result.error ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      getStatusIcon(result.status)
                    )}
                    <div>
                      <div className="font-mono text-sm">{result.url}</div>
                      {result.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Erro: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.error ? (
                      <Badge className="bg-red-100 text-red-800">Erro</Badge>
                    ) : (
                      <>
                        {getStatusBadge(result.status)}
                        <span className="text-sm text-muted-foreground">
                          {result.status}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {testResults.testResults?.some((r: any) => r.status >= 200 && r.status < 300) && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    AppyPay configurado com sucesso!
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-2">
                  Pelo menos uma URL respondeu corretamente. A integração deve funcionar no checkout.
                </p>
              </div>
            )}

            {testResults.testResults?.every((r: any) => r.error || r.status >= 400) && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">
                    Problemas de configuração detectados
                  </span>
                </div>
                <p className="text-red-700 text-sm mt-2">
                  Verifique as credenciais e URLs da AppyPay nas configurações do Supabase.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}