import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AppyPayDebugTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  
  const [testData, setTestData] = useState({
    productId: 'test-product-123',
    customerEmail: 'test@example.com',
    customerName: 'Test Customer',
    customerPhone: '+244123456789',
    amount: '10000', // 100.00 KZ
    orderId: `TEST-${Date.now()}`
  });

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing AppyPay connection...');
      console.log('📋 Test data:', testData);
      
      const { data, error } = await supabase.functions.invoke('create-appypay-reference', {
        body: testData
      });

      console.log('📤 Function response:', { data, error });
      
      if (error) {
        console.error('❌ Function invocation error:', error);
        setResult({ 
          success: false, 
          error: `Function Error: ${error.message}`,
          details: error
        });
        toast({
          title: "Erro na função",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('✅ Function executed successfully');
        setResult({ 
          success: true, 
          data: data,
          timestamp: new Date().toISOString()
        });
        toast({
          title: "Teste executado",
          description: data.success ? "Referência criada com sucesso!" : "Erro na API AppyPay",
          variant: data.success ? "default" : "destructive"
        });
      }
    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      setResult({ 
        success: false, 
        error: `Unexpected Error: ${error.message}`,
        details: error
      });
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 AppyPay Debug Test</CardTitle>
          <CardDescription>
            Teste de conexão e funcionamento da integração AppyPay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                value={testData.productId}
                onChange={(e) => setTestData(prev => ({ ...prev, productId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                value={testData.orderId}
                onChange={(e) => setTestData(prev => ({ ...prev, orderId: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={testData.customerName}
                onChange={(e) => setTestData(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={testData.customerEmail}
                onChange={(e) => setTestData(prev => ({ ...prev, customerEmail: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={testData.customerPhone}
                onChange={(e) => setTestData(prev => ({ ...prev, customerPhone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (centavos)</Label>
              <Input
                id="amount"
                value={testData.amount}
                onChange={(e) => setTestData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          </div>

          <Button 
            onClick={testConnection} 
            disabled={loading}
            className="w-full"
          >
            {loading ? '🔄 Testando...' : '🚀 Testar Conexão AppyPay'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.success ? '✅ Resultado do Teste' : '❌ Erro no Teste'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📝 Como usar:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Preencha os dados de teste (ou use os padrões)</li>
            <li>2. Clique em "Testar Conexão AppyPay"</li>
            <li>3. Verifique o console do navegador para logs detalhados</li>
            <li>4. Analise o resultado abaixo</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2">
            <strong>Nota:</strong> Abra o console do navegador (F12) para ver logs detalhados da operação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};