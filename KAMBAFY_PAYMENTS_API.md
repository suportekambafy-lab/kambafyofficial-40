# 🚀 Kambafy Payments API - Documentação

## 📋 Credenciais Geradas

```
API Key: kp_b5d70d968ab64886ca0fea02c6dea5c61af3f9ae6be997a608f9f9f9e1a07a64
Webhook Secret: 77e3ec211cb7b677ef6df984ebb54f1702e8505e4f4bd121f41fe2e495067890
```

⚠️ **IMPORTANTE**: Guarde estas credenciais em segurança. Elas NÃO serão mostradas novamente!

---

## 🔗 Endpoints Disponíveis

### Base URL
```
https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api
```

---

## 1️⃣ Criar Pagamento

### `POST /`

Cria um novo pagamento via Express (USSD) ou Referência (ATM).

#### Headers
```
Content-Type: application/json
x-api-key: kp_b5d70d968ab64886ca0fea02c6dea5c61af3f9ae6be997a608f9f9f9e1a07a64
```

#### Request Body (Express)
```json
{
  "orderId": "ORDER_123",
  "amount": 5000,
  "currency": "AOA",
  "paymentMethod": "express",
  "customerName": "João Silva",
  "customerEmail": "joao@email.com",
  "phoneNumber": "923456789",
  "metadata": {
    "productId": "prod_123",
    "notes": "Informações extras"
  }
}
```

#### Request Body (Referência)
```json
{
  "orderId": "ORDER_124",
  "amount": 10000,
  "currency": "AOA",
  "paymentMethod": "reference",
  "customerName": "Maria Santos",
  "customerEmail": "maria@email.com",
  "metadata": {
    "productId": "prod_456"
  }
}
```

#### Response (Express)
```json
{
  "id": "uuid-do-pagamento",
  "orderId": "ORDER_123",
  "status": "pending",
  "amount": 5000,
  "currency": "AOA",
  "paymentMethod": "express",
  "expiresAt": "2024-11-24T11:00:00Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "instructions": {
    "message": "Um código USSD foi enviado para 923456789. O cliente deve digitar o código no telefone para confirmar o pagamento.",
    "transactionId": "TR123456",
    "expiresIn": "5 minutos"
  }
}
```

#### Response (Referência)
```json
{
  "id": "uuid-do-pagamento",
  "orderId": "ORDER_124",
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

---

## 2️⃣ Verificar Pagamento

### `GET /payment/{paymentId}`

Obtém o status de um pagamento específico.

#### Headers
```
x-api-key: kp_b5d70d968ab64886ca0fea02c6dea5c61af3f9ae6be997a608f9f9f9e1a07a64
```

#### Response
```json
{
  "id": "uuid-do-pagamento",
  "orderId": "ORDER_123",
  "status": "completed",
  "amount": 5000,
  "currency": "AOA",
  "paymentMethod": "express",
  "customerName": "João Silva",
  "customerEmail": "joao@email.com",
  "customerPhone": "923456789",
  "transactionId": "TR123456",
  "expiresAt": "2024-11-24T11:00:00Z",
  "completedAt": "2024-11-24T10:58:30Z",
  "createdAt": "2024-11-24T10:55:00Z",
  "metadata": {
    "productId": "prod_123"
  }
}
```

---

## 3️⃣ Listar Pagamentos

### `GET /payments?status=pending&limit=50&offset=0`

Lista os pagamentos do parceiro com filtros opcionais.

#### Headers
```
x-api-key: kp_b5d70d968ab64886ca0fea02c6dea5c61af3f9ae6be997a608f9f9f9e1a07a64
```

#### Query Parameters
- `status` (opcional): `pending`, `completed`, `failed`, `expired`
- `limit` (opcional): Número de resultados (padrão: 50)
- `offset` (opcional): Paginação (padrão: 0)

#### Response
```json
{
  "data": [
    {
      "id": "uuid-1",
      "orderId": "ORDER_123",
      "status": "completed",
      "amount": 5000,
      "currency": "AOA",
      "paymentMethod": "express",
      "customerName": "João Silva",
      "customerEmail": "joao@email.com",
      "transactionId": "TR123456",
      "completedAt": "2024-11-24T10:58:30Z",
      "createdAt": "2024-11-24T10:55:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 🔔 Webhooks

Quando um pagamento for confirmado ou falhar, o Kambafy enviará uma notificação HTTP POST para a URL configurada.

### Configurar Webhook URL

Execute no SQL do Supabase:

```sql
UPDATE partners 
SET webhook_url = 'https://seu-app.com/webhook/kambafy'
WHERE contact_email = 'admin@kambafy.com';
```

### Payload do Webhook

```json
{
  "event": "payment.completed",
  "timestamp": "2024-11-24T10:58:30Z",
  "data": {
    "id": "uuid-do-pagamento",
    "orderId": "ORDER_123",
    "transactionId": "TR123456",
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

### Verificar Assinatura do Webhook

O Kambafy envia um header `X-Kambafy-Signature` com hash HMAC-SHA256 para você verificar a autenticidade.

#### Node.js/TypeScript
```typescript
import crypto from 'crypto';

function verifyWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}

// Uso no Express.js
app.post('/webhook/kambafy', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-kambafy-signature'] as string;
  const rawBody = req.body.toString();
  
  if (!verifyWebhook(rawBody, signature, process.env.KAMBAFY_WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(rawBody);
  
  if (event.event === 'payment.completed') {
    // Processar pagamento confirmado
    console.log('Pagamento confirmado:', event.data.orderId);
    // ... sua lógica aqui
  }
  
  res.status(200).send('OK');
});
```

#### Python
```python
import hmac
import hashlib

def verify_webhook(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return signature == expected_signature

# Flask
@app.route('/webhook/kambafy', methods=['POST'])
def kambafy_webhook():
    signature = request.headers.get('X-Kambafy-Signature')
    raw_body = request.get_data(as_text=True)
    
    if not verify_webhook(raw_body, signature, os.getenv('KAMBAFY_WEBHOOK_SECRET')):
        return 'Invalid signature', 401
    
    event = json.loads(raw_body)
    
    if event['event'] == 'payment.completed':
        # Processar pagamento confirmado
        print(f"Pagamento confirmado: {event['data']['orderId']}")
        # ... sua lógica aqui
    
    return 'OK', 200
```

---

## 📱 Exemplo de Integração Completa (React Native)

```typescript
// kambafy-sdk.ts
const KAMBAFY_API = 'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api';
const API_KEY = 'kp_b5d70d968ab64886ca0fea02c6dea5c61af3f9ae6be997a608f9f9f9e1a07a64';

interface CreatePaymentParams {
  orderId: string;
  amount: number;
  paymentMethod: 'express' | 'reference';
  customerName: string;
  customerEmail: string;
  phoneNumber?: string; // Obrigatório para 'express'
  metadata?: Record<string, any>;
}

export async function createPayment(params: CreatePaymentParams) {
  try {
    const response = await fetch(KAMBAFY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar pagamento');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await fetch(`${KAMBAFY_API}/payment/${paymentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao verificar pagamento');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    throw error;
  }
}

// Uso no componente
import { createPayment, getPaymentStatus } from './kambafy-sdk';

async function handlePayment() {
  try {
    // 1. Criar pagamento
    const payment = await createPayment({
      orderId: `ORDER_${Date.now()}`,
      amount: 5000,
      paymentMethod: 'express',
      customerName: 'João Silva',
      customerEmail: 'joao@email.com',
      phoneNumber: '923456789',
      metadata: {
        productId: 'prod_123',
      },
    });

    console.log('Pagamento criado:', payment);
    alert(payment.instructions.message);

    // 2. Polling para verificar status (opcional)
    const checkInterval = setInterval(async () => {
      const status = await getPaymentStatus(payment.id);
      
      if (status.status === 'completed') {
        clearInterval(checkInterval);
        alert('Pagamento confirmado! ✅');
        // Navegar para tela de sucesso
      } else if (status.status === 'failed' || status.status === 'expired') {
        clearInterval(checkInterval);
        alert('Pagamento falhou ou expirou ❌');
      }
    }, 5000); // Verificar a cada 5 segundos

  } catch (error) {
    alert(`Erro: ${error.message}`);
  }
}
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
WHERE contact_email = 'admin@kambafy.com';

-- Ver novas credenciais
SELECT api_key, webhook_secret 
FROM partners 
WHERE contact_email = 'admin@kambafy.com';
```

---

## 📊 Monitoramento

### Ver Logs de Uso da API

```sql
SELECT * FROM api_usage_logs 
WHERE partner_id = (
  SELECT id FROM partners WHERE contact_email = 'admin@kambafy.com'
)
ORDER BY created_at DESC 
LIMIT 100;
```

### Ver Status de Webhooks

```sql
SELECT * FROM webhook_status
ORDER BY updated_at DESC
LIMIT 50;
```

### Ver Pagamentos Recentes

```sql
SELECT 
  order_id,
  status,
  amount,
  payment_method,
  customer_name,
  created_at,
  completed_at
FROM external_payments
WHERE partner_id = (
  SELECT id FROM partners WHERE contact_email = 'admin@kambafy.com'
)
ORDER BY created_at DESC
LIMIT 100;
```

---

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verifique os logs da API: `api_usage_logs`
2. Verifique os webhooks: `webhook_status`
3. Entre em contato: admin@kambafy.com

---

## 🎉 Pronto!

Sua API de pagamentos Kambafy está ativa e funcionando. Bom uso! 🚀
