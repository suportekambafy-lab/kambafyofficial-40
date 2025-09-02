import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export const AppyPayTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('appypay-test', {
        body: {}
      });

      if (error) {
        console.error('Erro no teste:', error);
        setResults({ error: error.message });
      } else {
        console.log('Resultados do teste:', data);
        setResults(data);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      setResults({ error: (error as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Teste de Configuração AppyPay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testando...' : 'Executar Teste de Configuração'}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Ambiente:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(results.environment, null, 2)}
              </pre>
            </div>

            {results.testResults && (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Resultados dos Testes de URL:</h3>
                <div className="space-y-2">
                  {results.testResults.map((result: any, index: number) => (
                    <div key={index} className="border p-2 rounded">
                      <p><strong>URL:</strong> {result.url}</p>
                      {result.status && <p><strong>Status:</strong> {result.status}</p>}
                      {result.response && (
                        <details>
                          <summary>Resposta</summary>
                          <pre className="text-xs mt-2 overflow-auto">{result.response}</pre>
                        </details>
                      )}
                      {result.error && <p><strong>Erro:</strong> {result.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.error && (
              <div className="bg-destructive/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-destructive">Erro:</h3>
                <p className="text-sm">{results.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};