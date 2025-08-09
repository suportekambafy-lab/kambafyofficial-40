import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TestTube, Play, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface SalesRecoveryTesterProps {
  product: Product;
  onBack: () => void;
}

export function SalesRecoveryTester({ product, onBack }: SalesRecoveryTesterProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [testData, setTestData] = useState({
    customerEmail: "teste@exemplo.com",
    customerName: "João Silva",
    amount: 100,
    delayMinutes: 0
  });

  const handleCreateTestPurchase = async () => {
    setLoading(true);
    try {
      console.log("🔄 Criando carrinho abandonado de teste...");
      console.log("📝 Dados:", {
        product_id: product.id,
        customer_email: testData.customerEmail,
        customer_name: testData.customerName,
        amount: testData.amount,
        currency: "KZ"
      });
      
      const { data, error } = await supabase.functions.invoke('create-test-abandoned-purchase', {
        body: {
          product_id: product.id,
          customer_email: testData.customerEmail,
          customer_name: testData.customerName,
          amount: testData.amount,
          currency: "KZ",
          delay_minutes: testData.delayMinutes
        }
      });

      if (error) {
        console.error("Erro ao criar carrinho de teste:", error);
        throw error;
      }

      console.log("✅ Carrinho de teste criado:", data);
      
      toast({
        title: "✅ Carrinho de teste criado!",
        description: `Carrinho abandonado criado para ${testData.customerEmail}. Agora clique em "Processar Fila" para enviar o email.`,
      });

    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "❌ Erro ao criar carrinho",
        description: `Falha ao criar carrinho de teste: ${error.message || "Erro desconhecido"}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    try {
      console.log("🔄 Processando fila de recuperação...");
      
      const { data, error } = await supabase.functions.invoke('process-recovery-queue');

      if (error) {
        console.error("Erro ao processar fila:", error);
        throw error;
      }

      console.log("✅ Fila processada:", data);
      
      // Verificar se há dados na resposta
      if (data) {
        const { message, emailsSent, errors } = data;
        
        toast({
          title: "Fila processada com sucesso!",
          description: message || `${emailsSent || 0} emails enviados`,
        });

        // Se houver erros, mostrar em toast separado
        if (errors && errors.length > 0) {
          setTimeout(() => {
            toast({
              title: "Alguns erros encontrados",
              description: errors.slice(0, 2).join(", "), // Mostrar apenas os primeiros 2 erros
              variant: "destructive"
            });
          }, 1000);
        }
      } else {
        toast({
          title: "Processamento concluído",
          description: "Nenhum carrinho encontrado para processar",
        });
      }

    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro no processamento",
        description: `Falha ao processar fila: ${error.message || "Erro desconhecido"}`,
        variant: "destructive"
      });
    } finally {
      setProcessingQueue(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-primary" />
            Teste de Recuperação de Vendas
          </h1>
          <p className="text-muted-foreground">
            Teste o sistema para o produto: <span className="font-medium">{product.name}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Criar Carrinho Abandonado de Teste */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Criar Carrinho Abandonado de Teste
            </CardTitle>
            <CardDescription>
              Simule um carrinho abandonado para testar o sistema de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do cliente</Label>
                <Input
                  id="email"
                  type="email"
                  value={testData.customerEmail}
                  onChange={(e) => setTestData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="teste@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nome do cliente</Label>
                <Input
                  id="name"
                  value={testData.customerName}
                  onChange={(e) => setTestData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="João Silva"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (KZ)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={testData.amount}
                  onChange={(e) => setTestData(prev => ({ ...prev, amount: parseInt(e.target.value) }))}
                  placeholder="100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delay">Delay para teste (minutos)</Label>
                <Select value={testData.delayMinutes.toString()} onValueChange={(value) => setTestData(prev => ({ ...prev, delayMinutes: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar delay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Usar delay configurado</SelectItem>
                    <SelectItem value="1">1 minuto (teste imediato)</SelectItem>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={handleCreateTestPurchase} disabled={loading} className="w-full">
              {loading ? "Criando..." : "Criar Carrinho de Teste"}
            </Button>
          </CardContent>
        </Card>

        {/* Processar Fila */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Processar Fila de Recuperação
            </CardTitle>
            <CardDescription>
              Execute o processamento manual da fila de emails de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Este botão executa o mesmo processo que seria executado automaticamente. 
              Ele verifica todos os carrinhos abandonados e envia emails para aqueles que atingiram o tempo configurado.
            </p>
            
            <Button onClick={handleProcessQueue} disabled={processingQueue} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              {processingQueue ? "Processando..." : "Processar Fila Agora"}
            </Button>
          </CardContent>
        </Card>

        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Como Testar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">Passos para testar:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Configure um email válido (use seu próprio email para receber o teste)</li>
                <li>Defina um delay de teste (1 minuto para teste imediato)</li>
                <li>Clique em "Criar Carrinho de Teste"</li>
                <li>Aguarde o tempo configurado ou clique em "Processar Fila Agora"</li>
                <li>Verifique sua caixa de entrada</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Variáveis disponíveis no template:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <code>{"customer_name"}</code> - Nome do cliente</li>
                <li>• <code>{"product_name"}</code> - Nome do produto</li>
                <li>• <code>{"amount"}</code> - Valor da compra</li>
                <li>• <code>{"currency"}</code> - Moeda</li>
                <li>• <code>{"checkout_url"}</code> - Link para finalizar</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}