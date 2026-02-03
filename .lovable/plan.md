
# Plano: Corrigir Cálculo de Comissões - Taxa da Plataforma Primeiro

## Resumo do Problema

Atualmente, a taxa da plataforma é calculada sobre o valor **após** descontar a comissão do afiliado. O correto é calcular a taxa da plataforma sobre o valor **total** primeiro, e depois dividir o restante entre vendedor e afiliado.

### Exemplo com produto de 10 KZ e afiliado com 90%:

| Passo | Lógica Atual (ERRADA) | Lógica Nova (CORRETA) |
|-------|----------------------|----------------------|
| Valor Bruto | 10.00 KZ | 10.00 KZ |
| Taxa Plataforma (8.99%) | 0.09 KZ (sobre 1 KZ) | **0.90 KZ** (sobre 10 KZ) |
| Valor após taxa | - | 9.10 KZ |
| Afiliado (90%) | 9.00 KZ | **8.19 KZ** (90% de 9.10) |
| Vendedor | 0.91 KZ | **0.91 KZ** (10% de 9.10) |

## Alterações Necessárias

### 1. Edge Function: AppyPay (Angola)
**Arquivo:** `supabase/functions/create-appypay-charge/index.ts`

Alterar linhas 550-568:
```typescript
// NOVA LÓGICA: Taxa da plataforma sobre valor TOTAL primeiro
const platformFee = grossAmount * ANGOLA_PLATFORM_FEE;
const netAfterPlatformFee = grossAmount - platformFee;

if (resolvedAffiliateCode && resolvedAffiliateCommission !== null && Number.isFinite(resolvedAffiliateCommission) && resolvedAffiliateCommission > 0) {
  // Recalcular comissão do afiliado sobre valor líquido (após taxa plataforma)
  const affiliateRate = resolvedAffiliateCommission / grossAmount; // Ex: 9/10 = 0.90
  resolvedAffiliateCommission = Math.round(netAfterPlatformFee * affiliateRate * 100) / 100;
  sellerCommission = Math.round((netAfterPlatformFee - resolvedAffiliateCommission) * 100) / 100;
} else {
  sellerCommission = Math.round(netAfterPlatformFee * 100) / 100;
}
```

### 2. Edge Function: SISLOG (Moçambique)
**Arquivo:** `supabase/functions/create-sislog-payment/index.ts`

Alterar linhas 229-249:
```typescript
// NOVA LÓGICA: Taxa da plataforma sobre valor TOTAL primeiro
const platformFee = amount * MOZAMBIQUE_PLATFORM_FEE;
const netAfterPlatformFee = amount - platformFee;

if (orderData?.affiliate_code && orderData?.affiliate_commission) {
  const originalAffiliateCommission = parseFloat(orderData.affiliate_commission.toString());
  const affiliateRate = originalAffiliateCommission / amount;
  const newAffiliateCommission = Math.round(netAfterPlatformFee * affiliateRate * 100) / 100;
  sellerCommission = Math.round((netAfterPlatformFee - newAffiliateCommission) * 100) / 100;
  // Atualizar orderData.affiliate_commission
} else {
  sellerCommission = Math.round(netAfterPlatformFee * 100) / 100;
}
```

### 3. Database Trigger: Transações Financeiras
**Nova migração SQL:**

Atualizar a função `create_balance_transaction_on_sale()`:
```sql
-- NOVA LÓGICA: Taxa primeiro, depois divisão
-- 1. Calcular taxa da plataforma sobre valor BRUTO
platform_fee_amount := ROUND(gross_amount * platform_fee_rate, 2);
net_after_platform := gross_amount - platform_fee_amount;

-- 2. Calcular comissões sobre valor LÍQUIDO (após taxa)
IF affiliate_record IS NOT NULL THEN
  affiliate_rate := COALESCE(affiliate_commission_amount / gross_amount, 0);
  affiliate_commission_amount := ROUND(net_after_platform * affiliate_rate, 2);
  seller_final_amount := net_after_platform - affiliate_commission_amount;
ELSE
  seller_final_amount := net_after_platform;
END IF;
```

### 4. Edge Function: Stripe Webhook
**Arquivo:** `supabase/functions/stripe-webhook/index.ts`

Alterar linhas 744 e 780 para usar a nova lógica:
```typescript
// Antes: seller_commission: sellerCommissionInKZ * 0.9101
// Depois: Taxa já aplicada sobre total
const platformFee = amountInKZ * 0.0999; // 9.99% internacional
seller_commission = amountInKZ - platformFee;
// Se tiver afiliado, subtrair comissão do afiliado do valor líquido
```

### 5. Frontend: Checkout.tsx
**Arquivo:** `src/pages/Checkout.tsx`

Alterar linhas 1954-1955 para cálculo de display:
```typescript
// NOVA LÓGICA para cálculo local (display only)
const platformFee = totalAmount * 0.0899; // 8.99% Angola
const netAfterFee = totalAmount - platformFee;
affiliate_commission = Math.round(netAfterFee * affiliateRate * 100) / 100;
seller_commission = Math.round((netAfterFee - affiliate_commission) * 100) / 100;
```

## Impacto nos Valores

### Vendedor (10% após taxa)
- Antes: 0.91 KZ (sobre 1 KZ bruto)
- Depois: 0.91 KZ (10% de 9.10 KZ) ✅ **Mesmo valor**

### Afiliado (90% após taxa)
- Antes: 9.00 KZ (90% do bruto)
- Depois: 8.19 KZ (90% de 9.10 KZ) ⚠️ **Redução de 0.81 KZ**

### Plataforma
- Antes: 0.09 KZ (8.99% de 1 KZ)
- Depois: 0.90 KZ (8.99% de 10 KZ) ✅ **Taxa correta**

## Detalhes Técnicos

### Arquivos a Modificar:
1. `supabase/functions/create-appypay-charge/index.ts` - Linhas 550-568
2. `supabase/functions/create-sislog-payment/index.ts` - Linhas 229-249
3. `supabase/functions/stripe-webhook/index.ts` - Linhas 744, 780
4. `src/pages/Checkout.tsx` - Linhas 1954-1955
5. Nova migração SQL para atualizar `create_balance_transaction_on_sale()`

### Ordem de Implementação:
1. Atualizar trigger do banco de dados primeiro (fonte de verdade)
2. Atualizar Edge Functions (AppyPay, SISLOG, Stripe)
3. Atualizar frontend (Checkout.tsx)
4. Testar fluxo completo

### Backward Compatibility:
- Vendas antigas mantêm seus valores originais
- Nova lógica aplica-se apenas a vendas futuras
- O trigger verifica se já existem transações antes de processar
