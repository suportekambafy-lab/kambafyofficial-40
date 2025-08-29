import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const AppyPayEndpointTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const testEndpoints = async () => {
    setLoading(true);
    setResults([]);
    
    // Lista de endpoints possíveis para referências (baseado na URL fornecida)
    const endpointsToTest = [
      '/references', // Endpoint correto fornecido pelo utilizador
      '/references/create',
      '/v1/references', // Com versão explícita
      '/payments', 
      '/payments/create',
      '/transactions',
      '/transactions/create', 
      '/orders',
      '/orders/create',
      '/checkout',
      '/checkout/create',
      '/payment-references',
      '/api/references', // Com prefixo api
      '/api/payments',
      '/api/transactions',
    ];

    const testData = {
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      amount: 10000,
      currency: 'KZ',
      reference: 'TEST-REF-123',
      description: 'Test payment',
      customer_email: 'test@example.com',
      customer_name: 'Test Customer',
      customer_phone: '+244123456789',
      expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()
    };

    const testResults = [];

    for (const endpoint of endpointsToTest) {
      try {
        console.log(`🧪 Testing endpoint: ${endpoint}`);
        
        const response = await fetch(`https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/create-appypay-reference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A`
          },
          body: JSON.stringify({
            productId: 'test-product-123',
            customerEmail: 'test@example.com',
            customerName: 'Test Customer',
            customerPhone: '+244123456789',
            amount: '10000',
            orderId: `TEST-${Date.now()}`,
            testEndpoint: endpoint // Parâmetro especial para testar diferentes endpoints
          })
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { error: 'Invalid JSON', raw: responseText };
        }

        testResults.push({
          endpoint,
          status: response.status,
          success: response.ok,
          response: responseData,
          timestamp: new Date().toISOString()
        });

        console.log(`📤 ${endpoint}: Status ${response.status}`, responseData);
        
      } catch (error: any) {
        testResults.push({
          endpoint,
          status: 'ERROR',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.error(`❌ ${endpoint}: Error`, error);
      }
    }

    setResults(testResults);
    setLoading(false);
    
    const successCount = testResults.filter(r => r.success).length;
    toast({
      title: "Teste de endpoints concluído",
      description: `${successCount}/${testResults.length} endpoints funcionaram`,
      variant: successCount > 0 ? "default" : "destructive"
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 AppyPay Endpoint Discovery</CardTitle>
        <CardDescription>
          Testa diferentes endpoints possíveis da API AppyPay para encontrar o correto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testEndpoints} 
          disabled={loading}
          className="w-full"
        >
          {loading ? '🔄 Testando endpoints...' : '🚀 Testar Todos os Endpoints'}
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
                    <code className="text-sm font-mono">{result.endpoint}</code>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600">Ver resposta</summary>
                    <pre className="mt-2 p-2 bg-white rounded border overflow-auto max-h-32">
                      {JSON.stringify(result.response || result.error, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>💡 Este teste:</strong></p>
          <p>• Testa 15 endpoints diferentes da API AppyPay focados em referências</p>
          <p>• Identifica qual endpoint está funcionando</p>
          <p>• Mostra as respostas detalhadas de cada um</p>
          <p>• Ajuda a diagnosticar problemas de URL/endpoint</p>
        </div>
      </CardContent>
    </Card>
  );
};