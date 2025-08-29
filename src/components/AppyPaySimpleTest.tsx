import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const AppyPaySimpleTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testDirectCall = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing direct fetch to AppyPay function...');
      
      const response = await fetch('https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/create-appypay-reference', {
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
          orderId: `TEST-${Date.now()}`
        })
      });

      console.log('📤 Response status:', response.status);
      console.log('📤 Response headers:', [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log('📤 Response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('📤 Parsed response:', responseData);
      } catch (e) {
        console.error('❌ Could not parse response as JSON');
        responseData = { error: 'Invalid JSON response', raw: responseText };
      }
      
      setResult({
        success: response.ok,
        status: response.status,
        data: responseData,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: response.ok ? "Teste executado com sucesso" : "Erro no teste",
        description: response.ok ? "Função respondeu corretamente" : `Status ${response.status}`,
        variant: response.ok ? "default" : "destructive"
      });
      
    } catch (error: any) {
      console.error('💥 Network error:', error);
      setResult({
        success: false,
        error: `Network Error: ${error.message}`,
        details: error,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Erro de rede",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 AppyPay Direct Test</CardTitle>
        <CardDescription>
          Teste direto da edge function AppyPay (via fetch)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testDirectCall} 
          disabled={loading}
          className="w-full"
        >
          {loading ? '🔄 Testando...' : '🚀 Testar Função Diretamente'}
        </Button>

        {result && (
          <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader>
              <CardTitle className={result.success ? 'text-green-700' : 'text-red-700'}>
                {result.success ? '✅ Sucesso' : '❌ Erro'} - Status {result.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>💡 Este teste:</strong></p>
          <p>• Faz chamada HTTP direta para a edge function</p>
          <p>• Mostra status HTTP e resposta completa</p>
          <p>• Exibe logs detalhados no console</p>
          <p>• Não depende do client Supabase</p>
        </div>
      </CardContent>
    </Card>
  );
};