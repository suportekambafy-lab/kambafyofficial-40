# 🚀 Kambafy Payments API - Documentação Completa

## ⚡ Quick Start - Comece em 2 minutos!

### Pagamento Express (Multicaixa Express / Push) - Copie e cole:

```bash
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "pedido_001",
    "amount": 5000,
    "paymentMethod": "express",
    "phoneNumber": "923456789",
    "customerName": "João Silva",
    "customerEmail": "joao@email.com"
  }'
```

### Pagamento Referência (ATM) - Copie e cole:

```bash
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "pedido_002",
    "amount": 10000,
    "paymentMethod": "reference",
    "customerName": "Maria Santos",
    "customerEmail": "maria@email.com"
  }'
```

### Pagamento com Cartão (Internacional) - Copie e cole:

```bash
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "pedido_003",
    "amount": 2500,
    "currency": "USD",
    "paymentMethod": "card",
    "customerName": "John Doe",
    "customerEmail": "john@email.com",
    "successUrl": "https://meusite.com/sucesso",
    "cancelUrl": "https://meusite.com/checkout"
  }'
```

---

## 📋 Tabela de Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `orderId` | string | ✅ Sim | ID único do pedido no seu sistema |
| `amount` | number | ✅ Sim | Valor em **centavos** (5000 = 50,00 AOA) |
| `paymentMethod` | string | ✅ Sim | `"express"` (Multicaixa Express), `"reference"` (ATM) ou `"card"` (Cartão Internacional) |
| `customerName` | string | ✅ Sim | Nome completo do cliente |
| `customerEmail` | string | ✅ Sim | Email do cliente |
| `phoneNumber` | string | ⚠️ Condicional | Telefone (9-15 dígitos; **apenas números**). `+` e espaços são ignorados. **Obrigatório para `express`** |
| `currency` | string | ❌ Não | Moeda (padrão: `"AOA"`). Para `card` use `"USD"`, `"EUR"`, etc. |
| `successUrl` | string | ❌ Não | URL de retorno após pagamento com sucesso (apenas `card`) |
| `cancelUrl` | string | ❌ Não | URL de retorno se cliente cancelar (apenas `card`) |
| `metadata` | object | ❌ Não | Dados extras (productId, notes, etc.) |

---

## 📤 Respostas da API

### ✅ Sucesso - Pagamento Express (HTTP 200)

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "pedido_001",
  "status": "pending",
  "amount": 5000,
  "currency": "AOA",
  "paymentMethod": "express",
  "expiresAt": "2024-11-24T11:00:00Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "instructions": {
    "message": "Uma notificação de pagamento foi enviada para 923456789. O cliente deve confirmar no telemóvel (Multicaixa Express).",
    "transactionId": "TR123456ABC",
    "expiresIn": "5 minutos"
  }
}
```

### ✅ Sucesso - Pagamento Referência (HTTP 200)

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "orderId": "pedido_002",
  "status": "pending",
  "amount": 10000,
  "currency": "AOA",
  "paymentMethod": "reference",
  "expiresAt": "2024-11-26T10:55:00Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "reference": {
    "entity": "10023",
    "reference": "123 456 789",
    "instructions": "Pague em qualquer ATM Multicaixa usando:\nEntidade: 10023\nReferência: 123 456 789",
    "expiresIn": "48 horas"
  }
}
```

### ✅ Sucesso - Pagamento com Cartão (HTTP 200)

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "orderId": "pedido_003",
  "status": "pending",
  "amount": 2500,
  "currency": "USD",
  "paymentMethod": "card",
  "expiresAt": "2024-11-25T10:55:00Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "checkout": {
    "url": "https://checkout.example.com/pay/cs_xxx",
    "expiresIn": "24 horas"
  },
  "instructions": "Redirecione o cliente para a URL de checkout para completar o pagamento com cartão."
}
```

## ❌ Respostas de Erro

### 400 Bad Request - Dados Inválidos

```json
{
  "success": false,
  "error": "Campo phoneNumber é obrigatório para pagamentos express",
  "code": "VALIDATION_ERROR"
}
```

**Causas comuns:**
- `orderId` não fornecido
- `amount` inválido ou zero
- `paymentMethod` diferente de "express" ou "reference"
- `phoneNumber` ausente para pagamento express
- `customerName` ou `customerEmail` vazio

### 401 Unauthorized - API Key Inválida

```json
{
  "success": false,
  "error": "API key inválida ou não autorizada",
  "code": "UNAUTHORIZED"
}
```

**Causas comuns:**
- Header `x-api-key` não enviado
- API Key incorreta ou expirada
- Parceiro desativado

### 409 Conflict - Pedido Duplicado

```json
{
  "success": false,
  "error": "Já existe um pagamento para este orderId",
  "code": "DUPLICATE_ORDER"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Erro interno do servidor",
  "code": "SERVER_ERROR"
}
```

---

## 🔄 Fluxo de Status do Pagamento

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   pending ──────┬──────► processing ──────┬──────► completed ✅
│                 │                         │
│                 │                         └──────► failed ❌
│                 │
│                 └─────────────────────────────────► expired ⏰
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Status | Descrição |
|--------|-----------|
| `pending` | Pagamento criado, aguardando confirmação do cliente |
| `processing` | Cliente iniciou o pagamento, em processamento |
| `completed` | ✅ Pagamento confirmado com sucesso |
| `failed` | ❌ Pagamento falhou (recusado, erro, etc.) |
| `expired` | ⏰ Tempo limite expirou sem pagamento |

---

## 🔗 Endpoints Disponíveis

### Base URL
```
https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api
```

---

## 1️⃣ Criar Pagamento

### `POST /`

#### Headers Obrigatórios
```
Content-Type: application/json
x-api-key: SUA_API_KEY
```

#### cURL Completo (Express)
```bash
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "ORDER_123",
    "amount": 5000,
    "paymentMethod": "express",
    "customerName": "João Silva",
    "customerEmail": "joao@email.com",
    "phoneNumber": "923456789",
    "metadata": {
      "productId": "prod_123",
      "notes": "Compra de curso"
    }
  }'
```

#### cURL Completo (Referência)
```bash
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "ORDER_124",
    "amount": 10000,
    "paymentMethod": "reference",
    "customerName": "Maria Santos",
    "customerEmail": "maria@email.com",
    "metadata": {
      "productId": "prod_456"
    }
  }'
```

#### cURL Completo (Cartão)
```bash
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "ORDER_125",
    "amount": 2500,
    "currency": "USD",
    "paymentMethod": "card",
    "customerName": "John Doe",
    "customerEmail": "john@email.com",
    "successUrl": "https://meusite.com/sucesso?order=ORDER_125",
    "cancelUrl": "https://meusite.com/checkout",
    "metadata": {
      "productId": "prod_789",
      "productName": "Curso Premium"
    }
  }'
```

**Resposta Cartão:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "orderId": "ORDER_125",
  "status": "pending",
  "amount": 2500,
  "currency": "USD",
  "paymentMethod": "card",
  "expiresAt": "2024-11-25T10:55:00Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "checkout": {
    "url": "https://checkout.example.com/pay/cs_xxx",
    "expiresIn": "24 horas"
  },
  "instructions": "Redirecione o cliente para a URL de checkout para completar o pagamento com cartão."
}
```

**Fluxo do Pagamento com Cartão:**
1. Criar pagamento via API → Recebe `checkout.url`
2. Redirecionar cliente para `checkout.url`
3. Cliente paga com cartão na página de checkout
4. Após sucesso, cliente é redirecionado para `successUrl`
5. Webhook `payment.completed` é enviado para sua URL configurada

---

## 2️⃣ Verificar Pagamento

### `GET /payment/{paymentId}`

#### cURL
```bash
curl -X GET "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api/payment/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-api-key: SUA_API_KEY"
```

#### Resposta de Sucesso (HTTP 200)
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "ORDER_123",
  "status": "completed",
  "amount": 5000,
  "currency": "AOA",
  "paymentMethod": "express",
  "customerName": "João Silva",
  "customerEmail": "joao@email.com",
  "customerPhone": "923456789",
  "transactionId": "TR123456ABC",
  "expiresAt": "2024-11-24T11:00:00Z",
  "completedAt": "2024-11-24T10:58:30Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "metadata": {
    "productId": "prod_123"
  }
}
```

#### Resposta de Erro - Pagamento não encontrado (HTTP 404)
```json
{
  "success": false,
  "error": "Pagamento não encontrado",
  "code": "NOT_FOUND"
}
```

---

## 3️⃣ Listar Pagamentos

### `GET /payments?status=pending&limit=50&offset=0`

#### cURL
```bash
curl -X GET "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api/payments?status=completed&limit=10" \
  -H "x-api-key: SUA_API_KEY"
```

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `status` | string | todos | Filtrar: `pending`, `completed`, `failed`, `expired` |
| `limit` | number | 50 | Máximo de resultados (1-100) |
| `offset` | number | 0 | Paginação |

#### Resposta de Sucesso (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": "ORDER_123",
      "status": "completed",
      "amount": 5000,
      "currency": "AOA",
      "paymentMethod": "express",
      "customerName": "João Silva",
      "customerEmail": "joao@email.com",
      "transactionId": "TR123456ABC",
      "completedAt": "2024-11-24T10:58:30Z",
      "createdAt": "2024-11-24T10:55:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 🧪 Modo Sandbox / Testes

Para testar a integração sem cobrar de verdade:

### Números de Teste (Express)
| Número | Comportamento |
|--------|---------------|
| `923000001` | ✅ Pagamento aprovado após 10 segundos |
| `923000002` | ❌ Pagamento recusado |
| `923000003` | ⏰ Pagamento expira (sem resposta) |

### Valores de Teste
| Valor (centavos) | Comportamento |
|------------------|---------------|
| `100` | ✅ Sempre aprovado |
| `999` | ❌ Sempre recusado |
| `998` | ⏰ Sempre expira |

### Exemplo de Teste
```bash
# Teste de sucesso
curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "orderId": "teste_001",
    "amount": 100,
    "paymentMethod": "express",
    "phoneNumber": "923000001",
    "customerName": "Teste",
    "customerEmail": "teste@teste.com"
  }'
```

---

## 🔔 Webhooks

Quando um pagamento mudar de status, o Kambafy envia uma notificação para sua URL configurada.

### Eventos Disponíveis
| Evento | Descrição |
|--------|-----------|
| `payment.completed` | Pagamento confirmado com sucesso |
| `payment.failed` | Pagamento falhou |
| `payment.expired` | Pagamento expirou |

### Payload do Webhook

```json
{
  "event": "payment.completed",
  "timestamp": "2024-11-24T10:58:30Z",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "orderId": "ORDER_123",
    "transactionId": "TR123456ABC",
    "amount": 5000,
    "currency": "AOA",
    "paymentMethod": "express",
    "status": "completed",
    "customerName": "João Silva",
    "customerEmail": "joao@email.com",
    "customerPhone": "923456789",
    "referenceEntity": null,
    "referenceNumber": null,
    "completedAt": "2024-11-24T10:58:30Z",
    "createdAt": "2024-11-24T10:55:00Z",
    "metadata": {
      "productId": "prod_123"
    }
  }
}
```

### Headers do Webhook
```
Content-Type: application/json
X-Kambafy-Signature: abc123def456...
X-Kambafy-Event: payment.completed
X-Kambafy-Timestamp: 1732445910
```

### Verificar Assinatura (Segurança)

**⚠️ IMPORTANTE**: Sempre verifique a assinatura para garantir que o webhook veio do Kambafy!

#### Node.js/TypeScript
```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Express.js
app.post('/webhook/kambafy', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-kambafy-signature'] as string;
  const rawBody = req.body.toString();
  
  if (!verifyWebhook(rawBody, signature, process.env.KAMBAFY_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(rawBody);
  
  switch (event.event) {
    case 'payment.completed':
      console.log('✅ Pagamento confirmado:', event.data.orderId);
      // Liberar acesso ao produto, enviar email, etc.
      break;
    case 'payment.failed':
      console.log('❌ Pagamento falhou:', event.data.orderId);
      break;
    case 'payment.expired':
      console.log('⏰ Pagamento expirou:', event.data.orderId);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

#### Python (Flask)
```python
import hmac
import hashlib
import json
import os

def verify_webhook(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return signature == expected

@app.route('/webhook/kambafy', methods=['POST'])
def kambafy_webhook():
    signature = request.headers.get('X-Kambafy-Signature')
    raw_body = request.get_data(as_text=True)
    
    if not verify_webhook(raw_body, signature, os.getenv('KAMBAFY_WEBHOOK_SECRET')):
        return {'error': 'Invalid signature'}, 401
    
    event = json.loads(raw_body)
    
    if event['event'] == 'payment.completed':
        print(f"✅ Pagamento confirmado: {event['data']['orderId']}")
    
    return {'received': True}, 200
```

#### PHP
```php
<?php
function verifyWebhook($payload, $signature, $secret) {
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_KAMBAFY_SIGNATURE'] ?? '';
$secret = getenv('KAMBAFY_WEBHOOK_SECRET');

if (!verifyWebhook($payload, $signature, $secret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = json_decode($payload, true);

if ($event['event'] === 'payment.completed') {
    // Processar pagamento
    error_log("✅ Pagamento confirmado: " . $event['data']['orderId']);
}

http_response_code(200);
echo json_encode(['received' => true]);
```

---

## 📱 SDK JavaScript/TypeScript

```typescript
// kambafy-sdk.ts
const KAMBAFY_API = 'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api';

interface PaymentParams {
  orderId: string;
  amount: number;
  paymentMethod: 'express' | 'reference' | 'card';
  customerName: string;
  customerEmail: string;
  phoneNumber?: string;
  currency?: string;
  successUrl?: string;  // Para card
  cancelUrl?: string;   // Para card
  metadata?: Record<string, any>;
}

interface PaymentResponse {
  success: boolean;
  id: string;
  orderId: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  expiresAt: string;
  createdAt: string;
  instructions?: {
    message: string;
    transactionId: string;
    expiresIn: string;
  };
  reference?: {
    entity: string;
    reference: string;
    instructions: string;
    expiresIn: string;
  };
}

export class KambafySDK {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createPayment(params: PaymentParams): Promise<PaymentResponse> {
    const response = await fetch(KAMBAFY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar pagamento');
    }

    return data;
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const response = await fetch(`${KAMBAFY_API}/payment/${paymentId}`, {
      headers: { 'x-api-key': this.apiKey },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao verificar pagamento');
    }

    return data;
  }

  async listPayments(options?: { status?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const response = await fetch(`${KAMBAFY_API}/payments?${params}`, {
      headers: { 'x-api-key': this.apiKey },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao listar pagamentos');
    }

    return data;
  }
}

// Uso
const kambafy = new KambafySDK('SUA_API_KEY');

// Criar pagamento express
const payment = await kambafy.createPayment({
  orderId: 'pedido_001',
  amount: 5000,
  paymentMethod: 'express',
  phoneNumber: '923456789',
  customerName: 'João Silva',
  customerEmail: 'joao@email.com',
});

console.log('Pagamento criado:', payment.id);
console.log('Instruções:', payment.instructions?.message);
```

---

## 🔐 Segurança

### ✅ Boas Práticas

1. **Nunca exponha** a API Key no código do frontend
2. **Use HTTPS** sempre
3. **Valide** a assinatura de todos os webhooks recebidos
4. **Implemente** rate limiting no seu backend
5. **Armazene** as credenciais em variáveis de ambiente

### ⚠️ Rotação de Credenciais

Para gerar novas credenciais, execute no SQL:

```sql
UPDATE partners 
SET 
  api_key = 'kp_' || encode(gen_random_bytes(32), 'hex'),
  webhook_secret = encode(gen_random_bytes(32), 'hex'),
  updated_at = NOW()
WHERE contact_email = 'seu@email.com';

-- Ver novas credenciais
SELECT api_key, webhook_secret 
FROM partners 
WHERE contact_email = 'seu@email.com';
```

---

## 📊 Códigos HTTP de Referência

| Código | Status | Descrição |
|--------|--------|-----------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Pagamento criado com sucesso |
| 400 | Bad Request | Dados inválidos na requisição |
| 401 | Unauthorized | API Key inválida |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | Conflito (orderId duplicado) |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Server Error | Erro interno do servidor |

---

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verifique a resposta de erro da API
2. Confira se a API Key está correta
3. Valide o formato dos dados enviados
4. Entre em contato: **admin@kambafy.com**

---

## 🎉 Pronto!

Sua integração com a API Kambafy Payments está pronta. Bom uso! 🚀
