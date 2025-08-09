import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Copy, ExternalLink, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PartnersIntegrationWidget() {
  const [apiKey, setApiKey] = useState("kp_demo1234567890abcdef...");
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
  };

  const javascriptExample = `// Verificar saldo KambaPay
async function checkBalance(email) {
  const response = await fetch('/api/kambapay/balance?email=' + email, {
    headers: {
      'x-api-key': '${apiKey}'
    }
  });
  return response.json();
}

// Processar pagamento
async function processPayment(paymentData) {
  const response = await fetch('/api/kambapay/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${apiKey}'
    },
    body: JSON.stringify(paymentData)
  });
  return response.json();
}`;

  const phpExample = `<?php
// Verificar saldo KambaPay
function checkBalance($email) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.kambapay.com/balance?email=' . $email);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-api-key: ${apiKey}'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Processar pagamento
function processPayment($paymentData) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.kambapay.com/payments');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ${apiKey}'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}
?>`;

  const pythonExample = `import requests

# Verificar saldo KambaPay
def check_balance(email):
    headers = {'x-api-key': '${apiKey}'}
    response = requests.get(f'https://api.kambapay.com/balance?email={email}', headers=headers)
    return response.json()

# Processar pagamento
def process_payment(payment_data):
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': '${apiKey}'
    }
    response = requests.post('https://api.kambapay.com/payments', json=payment_data, headers=headers)
    return response.json()`;

  return (
    <div className="space-y-6">
      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Integração Rápida</span>
          </CardTitle>
          <CardDescription>
            Comece a aceitar pagamentos KambaPay em minutos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">1</span>
              </div>
              <h4 className="font-semibold">Registre-se</h4>
              <p className="text-sm text-muted-foreground">Candidate-se a parceiro</p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">2</span>
              </div>
              <h4 className="font-semibold">Obtenha API Key</h4>
              <p className="text-sm text-muted-foreground">Após aprovação</p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">3</span>
              </div>
              <h4 className="font-semibold">Integre</h4>
              <p className="text-sm text-muted-foreground">Use nossos exemplos</p>
            </div>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button asChild>
              <a href="/partners/apply">
                Candidatar-se Agora
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Exemplos de Código</CardTitle>
          <CardDescription>
            Integre a API KambaPay na sua linguagem preferida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="javascript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            
            <TabsContent value="javascript" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{javascriptExample}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(javascriptExample)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="php" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{phpExample}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(phpExample)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="python" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{pythonExample}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(pythonExample)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verificação de Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Verifique se o cliente tem saldo suficiente antes de processar
            </p>
            <Badge variant="secondary">GET /balance</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processamento Instantâneo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Processe pagamentos em tempo real via KambaPay
            </p>
            <Badge variant="secondary">POST /payments</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Receba notificações automáticas sobre transações
            </p>
            <Badge variant="secondary">Configurável</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Dashboard completo com estatísticas detalhadas
            </p>
            <Badge variant="secondary">GET /stats</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}