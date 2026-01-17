import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, Copy, Check, Zap, Shield, Globe, Webhook, CreditCard, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api';

const ApiDocumentation = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyCode(code, id)}
      >
        {copiedCode === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );

  const endpoints = [
    {
      method: 'POST',
      path: '/',
      title: 'Criar Pagamento',
      description: 'Cria um novo pagamento via Express, Referência ou Cartão de Crédito',
      badge: 'Essencial',
      badgeVariant: 'default' as const,
    },
    {
      method: 'GET',
      path: '/payment/{id}',
      title: 'Verificar Status',
      description: 'Consulta o status atual de um pagamento',
      badge: 'Essencial',
      badgeVariant: 'default' as const,
    },
    {
      method: 'GET',
      path: '/payments',
      title: 'Listar Pagamentos',
      description: 'Lista todos os pagamentos com filtros e paginação',
      badge: 'Útil',
      badgeVariant: 'secondary' as const,
    },
    {
      method: 'GET',
      path: '/balance',
      title: 'Consultar Saldo',
      description: 'Retorna o saldo disponível de um cliente por email',
      badge: 'Novo',
      badgeVariant: 'outline' as const,
    },
    {
      method: 'POST',
      path: '/refunds',
      title: 'Solicitar Reembolso',
      description: 'Cria uma solicitação de reembolso para um pagamento',
      badge: 'Novo',
      badgeVariant: 'outline' as const,
    },
    {
      method: 'GET',
      path: '/stats',
      title: 'Estatísticas',
      description: 'Retorna estatísticas de uso e transações do parceiro',
      badge: 'Novo',
      badgeVariant: 'outline' as const,
    },
  ];

  const curlCreateExpress = `curl -X POST "${API_BASE_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "orderId": "order_123",
    "amount": 5000,
    "currency": "AOA",
    "paymentMethod": "express",
    "phoneNumber": "+244923456789",
    "customerName": "João Silva",
    "customerEmail": "joao@email.com"
  }'`;

  const curlCreateReference = `curl -X POST "${API_BASE_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "orderId": "order_456",
    "amount": 10000,
    "currency": "AOA",
    "paymentMethod": "reference",
    "customerName": "Maria Santos",
    "customerEmail": "maria@email.com"
  }'`;

  const curlCreateCard = `curl -X POST "${API_BASE_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "orderId": "order_789",
    "amount": 15000,
    "currency": "AOA",
    "paymentMethod": "card",
    "customerName": "Pedro Costa",
    "customerEmail": "pedro@email.com",
    "successUrl": "https://seusite.com/sucesso",
    "cancelUrl": "https://seusite.com/cancelado"
  }'`;

  // Resposta do pagamento por cartão retorna uma URL de checkout
  const cardResponseExample = `{
  "success": true,
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "order_789",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_...",
  "status": "pending",
  "message": "Redirecione o cliente para checkoutUrl para completar o pagamento"
}`;

  const curlGetPayment = `curl -X GET "${API_BASE_URL}/payment/{payment_id}" \\
  -H "x-api-key: YOUR_API_KEY"`;

  const curlListPayments = `curl -X GET "${API_BASE_URL}/payments?status=completed&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`;

  const jsExample = `import axios from 'axios';

const kambafy = axios.create({
  baseURL: '${API_BASE_URL}',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

// Criar pagamento Express (USSD)
async function createExpressPayment() {
  const { data } = await kambafy.post('/', {
    orderId: 'order_' + Date.now(),
    amount: 5000,
    currency: 'AOA',
    paymentMethod: 'express',
    phoneNumber: '+244923456789',
    customerName: 'João Silva',
    customerEmail: 'joao@email.com'
  });
  
  console.log('Pagamento criado:', data);
  console.log('Instruções:', data.instructions?.message);
  return data;
}

// Verificar status do pagamento
async function checkPaymentStatus(paymentId) {
  const { data } = await kambafy.get(\`/payment/\${paymentId}\`);
  console.log('Status:', data.status);
  return data;
}

// Listar pagamentos
async function listPayments(status = 'completed') {
  const { data } = await kambafy.get('/payments', {
    params: { status, limit: 50 }
  });
  console.log('Total:', data.pagination.total);
  return data;
}`;

  const pythonExample = `import requests
import hmac
import hashlib

API_KEY = "YOUR_API_KEY"
BASE_URL = "${API_BASE_URL}"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# Criar pagamento Express
def create_express_payment(order_id, amount, phone, customer_name, customer_email):
    response = requests.post(BASE_URL, headers=headers, json={
        "orderId": order_id,
        "amount": amount,
        "currency": "AOA",
        "paymentMethod": "express",
        "phoneNumber": phone,
        "customerName": customer_name,
        "customerEmail": customer_email
    })
    return response.json()

# Verificar status
def get_payment(payment_id):
    response = requests.get(f"{BASE_URL}/payment/{payment_id}", headers=headers)
    return response.json()

# Consultar saldo
def get_balance(email):
    response = requests.get(f"{BASE_URL}/balance", headers=headers, params={"email": email})
    return response.json()

# Solicitar reembolso
def request_refund(payment_id, reason):
    response = requests.post(f"{BASE_URL}/refunds", headers=headers, json={
        "paymentId": payment_id,
        "reason": reason
    })
    return response.json()

# Verificar assinatura do webhook
def verify_webhook_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`;

  const phpExample = `<?php
// Configuração
$apiKey = "YOUR_API_KEY";
$baseUrl = "${API_BASE_URL}";

function kambafyRequest($method, $endpoint, $data = null) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init();
    $url = $baseUrl . $endpoint;
    
    $headers = [
        "Content-Type: application/json",
        "x-api-key: " . $apiKey
    ];
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($method === "POST") {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Criar pagamento Express
function createExpressPayment($orderId, $amount, $phone, $name, $email) {
    return kambafyRequest("POST", "/", [
        "orderId" => $orderId,
        "amount" => $amount,
        "currency" => "AOA",
        "paymentMethod" => "express",
        "phoneNumber" => $phone,
        "customerName" => $name,
        "customerEmail" => $email
    ]);
}

// Verificar status
function getPayment($paymentId) {
    return kambafyRequest("GET", "/payment/" . $paymentId);
}

// Consultar saldo
function getBalance($email) {
    return kambafyRequest("GET", "/balance?email=" . urlencode($email));
}

// Webhook handler (Laravel example)
Route::post('/webhook', function (Request $request) {
    $payload = $request->getContent();
    $signature = $request->header('X-Kambafy-Signature');
    $secret = env('KAMBAFY_WEBHOOK_SECRET');
    
    $expected = hash_hmac('sha256', $payload, $secret);
    
    if (!hash_equals($expected, $signature)) {
        return response()->json(['error' => 'Invalid signature'], 401);
    }
    
    $data = $request->json()->all();
    
    switch ($data['event']) {
        case 'payment.completed':
            // Liberar acesso ao produto
            Log::info("Pagamento {$data['payment_id']} confirmado!");
            break;
        case 'payment.failed':
            // Notificar cliente
            break;
    }
    
    return response()->json(['received' => true]);
});
?>`;

  const webhookPayloadExample = `{
  "event": "payment.completed",
  "payment_id": "550e8400-e29b-41d4-a716-446655440000",
  "order_id": "order_123",
  "amount": 5000,
  "currency": "AOA",
  "status": "completed",
  "customer_email": "cliente@email.com",
  "customer_name": "João Silva",
  "payment_method": "express",
  "completed_at": "2025-12-27T10:30:00Z",
  "metadata": { "product_id": "prod_abc" },
  "timestamp": "2025-12-27T10:30:05Z"
}`;

  const webhookVerifyExample = `// Node.js / TypeScript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// No seu endpoint de webhook
app.post('/webhook', (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-kambafy-signature'];
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event, payment_id, order_id, status } = req.body;
  
  switch (event) {
    case 'payment.completed':
      // Liberar acesso ao produto
      console.log(\`Pagamento \${payment_id} confirmado para pedido \${order_id}\`);
      break;
    case 'payment.failed':
      // Notificar cliente
      break;
    case 'payment.expired':
      // Cancelar pedido
      break;
  }
  
  res.json({ received: true });
});`;

  return (
    <>
      <Helmet>
        <title>Documentação API - Kambafy Payments</title>
        <meta name="description" content="Documentação completa da API de pagamentos Kambafy. Integre pagamentos Express e Referência em suas aplicações." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">Kambafy API</span>
              </div>
              <Badge variant="outline">v1.0</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/partners/apply')}>
                Tornar-se Parceiro
              </Button>
              <Button onClick={() => navigate('/partners/portal')}>
                Portal do Parceiro
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">API de Pagamentos</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Integre pagamentos Express (USSD), Referência (ATM) e Cartão de Crédito em suas aplicações com nossa API RESTful simples e segura.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Card>
              <CardContent className="pt-6 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Rápido</h3>
                <p className="text-sm text-muted-foreground">Respostas em &lt;100ms</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Seguro</h3>
                <p className="text-sm text-muted-foreground">HMAC-SHA256</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Webhook className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">Webhooks</h3>
                <p className="text-sm text-muted-foreground">Tempo real</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Globe className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold">RESTful</h3>
                <p className="text-sm text-muted-foreground">JSON everywhere</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Início Rápido
              </CardTitle>
              <CardDescription>
                Faça sua primeira requisição em segundos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Base URL:</p>
                <CodeBlock 
                  code={API_BASE_URL} 
                  language="text" 
                  id="base-url" 
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Autenticação:</p>
                <p className="text-sm text-muted-foreground">
                  Todas as requisições devem incluir o header <code className="bg-muted px-1 rounded">x-api-key</code> com sua chave de API.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Modo Sandbox (Teste):</p>
                <p className="text-sm text-muted-foreground">
                  Use API keys com prefixo <code className="bg-muted px-1 rounded">kp_test_</code> para ambiente sandbox.
                  Pagamentos sandbox não processam dinheiro real.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sandbox Mode */}
          <Card className="mb-8 border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Modo Sandbox (Teste)
              </CardTitle>
              <CardDescription>
                Teste sua integração sem processar pagamentos reais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">API Key de Teste</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use uma API key com prefixo <code className="bg-muted px-1 rounded">kp_test_</code>
                  </p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">kp_test_abc123...</code>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Números de Teste</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><code className="bg-muted px-1 rounded">923000000</code> → Sucesso imediato</li>
                    <li><code className="bg-muted px-1 rounded">923000001</code> → Falha simulada</li>
                    <li><code className="bg-muted px-1 rounded">923000002</code> → Pendente (timeout)</li>
                  </ul>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Dica:</strong> Pagamentos sandbox são marcados automaticamente como concluídos após 5 segundos quando usando o número de teste de sucesso.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant={endpoint.method === 'POST' ? 'default' : 'secondary'}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm">{endpoint.path}</code>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{endpoint.title}</p>
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Exemplos de Código
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl">
                <TabsList className="mb-4 flex-wrap">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="php">PHP</TabsTrigger>
                </TabsList>

                <TabsContent value="curl" className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Criar Pagamento Express (USSD)</h4>
                    <CodeBlock code={curlCreateExpress} language="bash" id="curl-express" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Criar Pagamento por Referência (ATM)</h4>
                    <CodeBlock code={curlCreateReference} language="bash" id="curl-reference" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      Criar Pagamento por Cartão de Crédito
                      <Badge variant="outline" className="text-xs">Novo</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Pagamentos por cartão são processados via Stripe. O cliente é redirecionado para uma página de checkout segura.
                    </p>
                    <CodeBlock code={curlCreateCard} language="bash" id="curl-card" />
                    <p className="text-sm text-muted-foreground mt-2 mb-2">Resposta:</p>
                    <CodeBlock code={cardResponseExample} language="json" id="curl-card-response" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Verificar Status do Pagamento</h4>
                    <CodeBlock code={curlGetPayment} language="bash" id="curl-get" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Listar Pagamentos</h4>
                    <CodeBlock code={curlListPayments} language="bash" id="curl-list" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Consultar Saldo</h4>
                    <CodeBlock code={`curl -X GET "${API_BASE_URL}/balance?email=cliente@email.com" \\
  -H "x-api-key: YOUR_API_KEY"`} language="bash" id="curl-balance" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Solicitar Reembolso</h4>
                    <CodeBlock code={`curl -X POST "${API_BASE_URL}/refunds" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"paymentId": "payment_id_here", "reason": "Cliente solicitou cancelamento"}'`} language="bash" id="curl-refund" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Ver Estatísticas</h4>
                    <CodeBlock code={`curl -X GET "${API_BASE_URL}/stats" \\
  -H "x-api-key: YOUR_API_KEY"`} language="bash" id="curl-stats" />
                  </div>
                </TabsContent>

                <TabsContent value="javascript">
                  <CodeBlock code={jsExample} language="javascript" id="js-example" />
                </TabsContent>

                <TabsContent value="python">
                  <CodeBlock code={pythonExample} language="python" id="python-example" />
                </TabsContent>

                <TabsContent value="php">
                  <CodeBlock code={phpExample} language="php" id="php-example" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Receba notificações em tempo real sobre eventos de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Eventos Suportados</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <Badge className="mb-2">payment.completed</Badge>
                    <p className="text-sm text-muted-foreground">Pagamento confirmado com sucesso</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="destructive" className="mb-2">payment.failed</Badge>
                    <p className="text-sm text-muted-foreground">Pagamento falhou ou foi rejeitado</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">payment.expired</Badge>
                    <p className="text-sm text-muted-foreground">Referência expirou sem pagamento</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="outline" className="mb-2">refund.completed</Badge>
                    <p className="text-sm text-muted-foreground">Reembolso processado</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Payload do Webhook</h4>
                <CodeBlock code={webhookPayloadExample} language="json" id="webhook-payload" />
              </div>

              <div>
                <h4 className="font-semibold mb-2">Verificando Assinatura</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Sempre verifique a assinatura HMAC-SHA256 no header <code className="bg-muted px-1 rounded">X-Kambafy-Signature</code>
                </p>
                <CodeBlock code={webhookVerifyExample} language="javascript" id="webhook-verify" />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">Importante</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Retorne status 200 para confirmar recebimento</li>
                  <li>• Processe webhooks de forma idempotente</li>
                  <li>• Temos retry automático com backoff exponencial</li>
                  <li>• Configure HTTPS obrigatório em produção</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Response Codes */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Códigos de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge className="bg-green-600">200</Badge>
                  <span className="font-medium">OK</span>
                  <span className="text-muted-foreground text-sm">Requisição processada com sucesso</span>
                </div>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge className="bg-green-600">201</Badge>
                  <span className="font-medium">Created</span>
                  <span className="text-muted-foreground text-sm">Recurso criado com sucesso</span>
                </div>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="secondary">400</Badge>
                  <span className="font-medium">Bad Request</span>
                  <span className="text-muted-foreground text-sm">Parâmetros inválidos ou ausentes</span>
                </div>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="destructive">401</Badge>
                  <span className="font-medium">Unauthorized</span>
                  <span className="text-muted-foreground text-sm">API key inválida ou ausente</span>
                </div>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="secondary">404</Badge>
                  <span className="font-medium">Not Found</span>
                  <span className="text-muted-foreground text-sm">Recurso não encontrado</span>
                </div>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="secondary">409</Badge>
                  <span className="font-medium">Conflict</span>
                  <span className="text-muted-foreground text-sm">Order ID duplicado</span>
                </div>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="destructive">500</Badge>
                  <span className="font-medium">Server Error</span>
                  <span className="text-muted-foreground text-sm">Erro interno do servidor</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-muted-foreground mb-6">
              Cadastre-se como parceiro e receba suas credenciais de API
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/partners/apply')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Tornar-se Parceiro
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/partners/portal')}>
                Acessar Portal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApiDocumentation;
