import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestFacebookIntegration() {
  const { toast } = useToast();
  const [productId, setProductId] = useState('');
  const [testAmount, setTestAmount] = useState('100');
  const [testCurrency, setTestCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false);
  const [pixelLoaded, setPixelLoaded] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (type: 'success' | 'error' | 'info', message: string, data?: any) => {
    setResults(prev => [...prev, { type, message, data, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testPixelLoad = () => {
    addResult('info', 'Verificando se Facebook Pixel está carregado...');
    
    if (typeof window !== 'undefined' && window.fbq) {
      setPixelLoaded(true);
      addResult('success', '✅ Facebook Pixel está carregado e funcional!');
      
      // Testar evento PageView
      try {
        window.fbq('track', 'PageView');
        addResult('success', '✅ Evento PageView enviado com sucesso');
      } catch (error) {
        addResult('error', '❌ Erro ao enviar PageView', error);
      }
    } else {
      setPixelLoaded(false);
      addResult('error', '❌ Facebook Pixel não está carregado. Configure primeiro na página do produto.');
    }
  };

  const testInitiateCheckout = () => {
    if (!window.fbq) {
      addResult('error', '❌ Facebook Pixel não está carregado');
      return;
    }

    try {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: [productId || 'test-product'],
        content_type: 'product',
        value: parseFloat(testAmount),
        currency: testCurrency
      });
      addResult('success', '✅ Evento InitiateCheckout enviado', {
        productId: productId || 'test-product',
        amount: testAmount,
        currency: testCurrency
      });
    } catch (error) {
      addResult('error', '❌ Erro ao enviar InitiateCheckout', error);
    }
  };

  const testPurchaseEvent = () => {
    if (!window.fbq) {
      addResult('error', '❌ Facebook Pixel não está carregado');
      return;
    }

    try {
      const testOrderId = `TEST-${Date.now()}`;
      
      // Disparar evento do pixel (navegador)
      window.fbq('track', 'Purchase', {
        content_ids: [productId || 'test-product'],
        content_type: 'product',
        value: parseFloat(testAmount),
        currency: testCurrency,
        order_id: testOrderId
      });
      
      addResult('success', '✅ Evento Purchase (Pixel) enviado', {
        orderId: testOrderId,
        amount: testAmount,
        currency: testCurrency
      });

      // Também disparar custom event
      window.dispatchEvent(new CustomEvent('purchase-completed', {
        detail: {
          productId: productId || 'test-product',
          orderId: testOrderId,
          amount: parseFloat(testAmount),
          currency: testCurrency
        }
      }));
      
      addResult('success', '✅ Custom event "purchase-completed" disparado');
    } catch (error) {
      addResult('error', '❌ Erro ao enviar Purchase', error);
    }
  };

  const testConversionsAPI = async () => {
    if (!productId) {
      toast({
        title: "Erro",
        description: "Por favor, insira um ID de produto válido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    addResult('info', '📤 Enviando evento para Facebook Conversions API...');

    try {
      const testOrderId = `TEST-API-${Date.now()}`;
      
      const { data, error } = await supabase.functions.invoke('send-facebook-conversion', {
        body: {
          productId: productId,
          orderId: testOrderId,
          amount: parseFloat(testAmount),
          currency: testCurrency,
          customerEmail: 'teste@kambafy.com',
          customerName: 'Usuário Teste',
          customerPhone: '+244900000000',
          eventSourceUrl: window.location.href
        }
      });

      if (error) {
        addResult('error', '❌ Erro na API de Conversões', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao enviar para API",
          variant: "destructive"
        });
      } else {
        addResult('success', '✅ Evento enviado para Facebook Conversions API', data);
        toast({
          title: "Sucesso",
          description: "Evento enviado para Facebook Conversions API"
        });
      }
    } catch (error: any) {
      addResult('error', '❌ Erro ao chamar edge function', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🧪 Teste de Integração Facebook</h1>
        <p className="text-muted-foreground">
          Teste eventos do Facebook Pixel e Conversions API sem criar vendas reais
        </p>
      </div>

      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="productId">ID do Produto</Label>
              <Input
                id="productId"
                placeholder="Cole o ID do produto aqui"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                O produto deve ter Facebook Pixel/API configurado
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Valor Teste</Label>
                <Input
                  id="amount"
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currency">Moeda</Label>
                <Input
                  id="currency"
                  value={testCurrency}
                  onChange={(e) => setTestCurrency(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testes do Facebook Pixel (Navegador)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={testPixelLoad} 
              variant="outline" 
              className="w-full"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              1. Verificar se Pixel está carregado
            </Button>
            
            <Button 
              onClick={testInitiateCheckout} 
              variant="outline" 
              className="w-full"
              disabled={!pixelLoaded}
            >
              <Zap className="mr-2 h-4 w-4" />
              2. Testar InitiateCheckout
            </Button>
            
            <Button 
              onClick={testPurchaseEvent} 
              variant="outline" 
              className="w-full"
              disabled={!pixelLoaded}
            >
              <Zap className="mr-2 h-4 w-4" />
              3. Testar Purchase (Pixel)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teste da Conversions API (Servidor)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testConversionsAPI} 
              className="w-full"
              disabled={loading || !productId}
            >
              <Zap className="mr-2 h-4 w-4" />
              {loading ? 'Enviando...' : 'Testar Conversions API'}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Resultados dos Testes</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearResults}>
                Limpar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      result.type === 'success' ? 'bg-green-50 border-green-200' :
                      result.type === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                      {result.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                      {result.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{result.message}</p>
                        <p className="text-xs text-muted-foreground">{result.timestamp}</p>
                        {result.data && (
                          <pre className="mt-2 text-xs bg-black/5 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">ℹ️ Instruções</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-900 space-y-2">
          <p><strong>1.</strong> Configure o Facebook Pixel e API na página do produto</p>
          <p><strong>2.</strong> Copie o ID do produto e cole acima</p>
          <p><strong>3.</strong> Execute os testes na ordem mostrada</p>
          <p><strong>4.</strong> Verifique os eventos no Gerenciador de Eventos do Facebook</p>
          <p className="mt-4 pt-4 border-t border-yellow-300">
            <strong>Nota:</strong> Os eventos de teste aparecerão no Facebook com os dados simulados.
            Use Test Events no Facebook para filtrar eventos de teste.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
