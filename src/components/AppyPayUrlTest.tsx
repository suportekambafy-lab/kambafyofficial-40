import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export const AppyPayUrlTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const { toast } = useToast();

  const testBaseUrls = async () => {
    setLoading(true);
    setResults([]);
    
    // URLs base possíveis para testar
    const baseUrlsToTest = [
      'https://api.appypay.com',
      'https://appypay.com/api',
      'https://sandbox.appypay.com',
      'https://api-sandbox.appypay.com',
      'https://gateway.appypay.com',
      'https://pay.appypay.com',
      'https://appypay.herokuapp.com',
      'https://api.appypay.ao',
      'https://appypay.ao/api',
      customBaseUrl // URL customizada do usuário
    ].filter(url => url); // Remove URLs vazias

    const testResults = [];

    for (const baseUrl of baseUrlsToTest) {
      try {
        console.log(`🧪 Testing base URL: ${baseUrl}`);
        
        // Primeiro teste: verificar se a URL responde
        const healthResponse = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        const healthText = await healthResponse.text();
        
        testResults.push({
          baseUrl,
          endpoint: '/ (root)',
          status: healthResponse.status,
          success: healthResponse.ok,
          response: healthText.substring(0, 200), // Primeiros 200 chars
          timestamp: new Date().toISOString()
        });

        // Se o root funcionar, testar alguns endpoints comuns
        if (healthResponse.ok) {
          const commonEndpoints = ['/health', '/status', '/api', '/v1', '/docs'];
          
          for (const endpoint of commonEndpoints) {
            try {
              const endpointResponse = await fetch(`${baseUrl}${endpoint}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
              });
              
              const endpointText = await endpointResponse.text();
              
              testResults.push({
                baseUrl,
                endpoint,
                status: endpointResponse.status,
                success: endpointResponse.ok,
                response: endpointText.substring(0, 200),
                timestamp: new Date().toISOString()
              });
            } catch (e) {
              testResults.push({
                baseUrl,
                endpoint,
                status: 'ERROR',
                success: false,
                error: e.message,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        console.log(`📤 ${baseUrl}: Status ${healthResponse.status}`);
        
      } catch (error: any) {
        testResults.push({
          baseUrl,
          endpoint: '/ (root)',
          status: 'ERROR',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.error(`❌ ${baseUrl}: Error`, error);
      }
    }

    setResults(testResults);
    setLoading(false);
    
    const successCount = testResults.filter(r => r.success).length;
    toast({
      title: "Teste de URLs base concluído",
      description: `${successCount}/${testResults.length} testes funcionaram`,
      variant: successCount > 0 ? "default" : "destructive"
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🌐 AppyPay URL Base Discovery</CardTitle>
        <CardDescription>
          Testa diferentes URLs base possíveis da API AppyPay para encontrar a correta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customUrl">URL Base Personalizada (opcional)</Label>
          <Input
            id="customUrl"
            placeholder="https://api.exemplo.com"
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Se você souber a URL base correta da API AppyPay, insira aqui
          </p>
        </div>

        <Button 
          onClick={testBaseUrls} 
          disabled={loading}
          className="w-full"
        >
          {loading ? '🔄 Testando URLs base...' : '🚀 Testar URLs Base da API'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Resultados dos Testes:</h3>
            {results.map((result, index) => (
              <Card 
                key={index} 
                className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono block truncate">
                        {result.baseUrl}{result.endpoint}
                      </code>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ml-2 flex-shrink-0 ${
                      result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600">Ver resposta</summary>
                    <pre className="mt-2 p-2 bg-white rounded border overflow-auto max-h-32 text-xs">
                      {result.response || result.error || 'Sem resposta'}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>💡 Este teste:</strong></p>
          <p>• Testa 9+ URLs base diferentes para a API AppyPay</p>
          <p>• Verifica se cada URL responde (status 200, 404, erro)</p>
          <p>• Testa endpoints comuns em URLs que funcionam</p>
          <p>• Identifica a URL base correta da API AppyPay</p>
          <p>• Se TODAS derem erro, a API pode estar offline ou não existir</p>
        </div>
      </CardContent>
    </Card>
  );
};