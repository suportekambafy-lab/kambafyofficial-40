
# Plano: Corrigir Facebook Pixel Purchase e UTMify para Moçambique

## Resumo do Problema

Os eventos de conversão (Purchase) não estão sendo enviados corretamente para o Facebook Pixel e UTMify quando pagamentos são confirmados via **SISLOG** (M-Pesa e e-Mola em Moçambique).

---

## Problemas Identificados

### 1. UTMify não está sendo chamado nas funções SISLOG

| Função | Facebook CAPI | UTMify |
|--------|--------------|--------|
| `sislog-webhook` | ✅ Envia | ❌ **Não envia** |
| `sislog-callback` | ✅ Envia | ❌ **Não envia** |
| `check-sislog-payments` (cron) | ❌ **Não envia** | ❌ **Não envia** |

### 2. Função UTMify não suporta MZN

No arquivo `send-utmify-conversion/index.ts` (linhas 166-180):
- **Problema**: Só converte `KZ`, `EUR` e `USD`. Para `MZN`, assume que o valor já está em USD.
- **Impacto**: Uma venda de 1.000 MT é enviada como $1.000 USD (deveria ser ~$15.60 USD)

### 3. Métodos de pagamento MZ não mapeados

```typescript
// Atual (não inclui mpesa/emola)
const paymentMethodMap = {
  'express': 'pix',
  'transfer': 'bank_transfer',
  ...
};
// mpesa e emola caem em 'other'
```

### 4. Função check-sislog-payments não dispara conversões

Quando o cron job confirma um pagamento pendente, ele:
- ✅ Atualiza status para `completed`
- ✅ Cria `customer_access`
- ✅ Envia e-mail e notificação
- ❌ **Não envia Facebook CAPI**
- ❌ **Não envia UTMify**

---

## Solução Proposta

### Passo 1: Atualizar `send-utmify-conversion`

Adicionar suporte para MZN e mapear métodos M-Pesa/e-Mola:

```typescript
// Taxa de câmbio MZN para USD
const MZN_TO_USD_RATE = 64; // 1 USD ≈ 64 MZN

// Na conversão de moeda:
if (orderData.currency?.toUpperCase() === 'MZN') {
  const amountInUSD = amount / MZN_TO_USD_RATE;
  amountInCents = Math.round(amountInUSD * 100);
  console.log(`💱 Conversão: ${amount} MZN → $${(amountInCents / 100).toFixed(2)} USD`);
}

// No mapeamento de métodos:
const paymentMethodMap = {
  ...
  'mpesa': 'pix',      // M-Pesa → PIX
  'emola': 'pix',      // e-Mola → PIX
  'card_mz': 'credit_card'
};
```

### Passo 2: Adicionar UTMify ao `sislog-webhook`

Após a linha 298 (depois do envio do Facebook), adicionar:

```typescript
// 📊 ENVIAR CONVERSÃO PARA UTMIFY
try {
  console.log('📊 Sending UTMify conversion...');
  
  const utmifyPayload = {
    orderId: order.order_id,
    orderUuid: order.id,
    amount: parseFloat(order.amount),
    currency: 'MZN',
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    customerCountry: 'Mozambique',
    productId: order.product_id,
    productName: product.name,
    paymentMethod: provider?.toLowerCase() || order.payment_method,
    utmParams: order.utm_data || {},
    orderBumpData: order.order_bump_data
  };
  
  const { data: utmResult, error: utmError } = await supabaseAdmin.functions.invoke('send-utmify-conversion', {
    body: utmifyPayload
  });
  
  if (utmError) {
    console.error('❌ UTMify error:', utmError);
  } else {
    console.log('✅ UTMify conversion sent:', utmResult);
  }
} catch (utmifyError) {
  console.error('❌ UTMify process error:', utmifyError);
}
```

### Passo 3: Adicionar UTMify ao `sislog-callback`

Mesmo bloco de código adicionado após o envio do Facebook (após linha 306).

### Passo 4: Adicionar conversões ao `check-sislog-payments`

Dentro do bloco `if (isPaid)` (após linha 270), adicionar:

```typescript
// Enviar Facebook CAPI
try {
  const eventId = `sislog_check_${order.order_id}_${Date.now()}`;
  const nameParts = (order.customer_name || '').trim().split(' ');
  
  await supabaseAdmin.functions.invoke('send-facebook-conversion', {
    body: {
      productId: order.product_id,
      userId: order.products?.user_id,
      eventId: eventId,
      eventName: 'Purchase',
      value: parseFloat(order.amount),
      currency: 'MZN',
      orderId: order.order_id,
      customer: {
        email: order.customer_email,
        phone: order.customer_phone || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
      }
    }
  });
  console.log('✅ Facebook conversion sent');
} catch (fbErr) {
  console.error('⚠️ Facebook conversion error:', fbErr);
}

// Enviar UTMify
try {
  await supabaseAdmin.functions.invoke('send-utmify-conversion', {
    body: {
      orderId: order.order_id,
      orderUuid: order.id,
      amount: parseFloat(order.amount),
      currency: 'MZN',
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      customerCountry: 'Mozambique',
      productId: order.product_id,
      productName: order.products?.name,
      paymentMethod: order.payment_method,
      utmParams: order.utm_data || {}
    }
  });
  console.log('✅ UTMify conversion sent');
} catch (utmErr) {
  console.error('⚠️ UTMify error:', utmErr);
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-utmify-conversion/index.ts` | Adicionar taxa MZN e mapear mpesa/emola |
| `supabase/functions/sislog-webhook/index.ts` | Adicionar chamada UTMify após Facebook |
| `supabase/functions/sislog-callback/index.ts` | Adicionar chamada UTMify após Facebook |
| `supabase/functions/check-sislog-payments/index.ts` | Adicionar FB CAPI + UTMify quando pago |

---

## Resultado Esperado

Após implementação:
1. ✅ Vendas via M-Pesa/e-Mola enviarão evento **Purchase** ao Facebook
2. ✅ Vendas via M-Pesa/e-Mola enviarão conversão ao **UTMify**
3. ✅ Valores em MZN serão convertidos corretamente para USD
4. ✅ O cron job também disparará conversões para pagamentos confirmados posteriormente

---

## Detalhes Técnicos

### Taxa de Conversão MZN
```
1 USD ≈ 64 MZN (taxa aproximada)
```

### Mapeamento de Métodos para UTMify
| Kambafy | UTMify |
|---------|--------|
| mpesa | pix |
| emola | pix |
| card_mz | credit_card |
