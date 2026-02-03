
# Plano: Corrigir Cálculo de Comissões - Taxa da Plataforma Primeiro

## ✅ STATUS: IMPLEMENTADO

## Resumo do Problema

Atualmente, a taxa da plataforma é calculada sobre o valor **após** descontar a comissão do afiliado. O correto é calcular a taxa da plataforma sobre o valor **total** primeiro, e depois dividir o restante entre vendedor e afiliado.

### Exemplo com produto de 10 KZ e afiliado com 90%:

| Passo | Lógica Antiga (ERRADA) | Lógica Nova (CORRETA) |
|-------|----------------------|----------------------|
| Valor Bruto | 10.00 KZ | 10.00 KZ |
| Taxa Plataforma (8.99%) | 0.09 KZ (sobre 1 KZ) | **0.90 KZ** (sobre 10 KZ) |
| Valor após taxa | - | 9.10 KZ |
| Afiliado (90%) | 9.00 KZ | **8.19 KZ** (90% de 9.10) |
| Vendedor | 0.91 KZ | **0.91 KZ** (10% de 9.10) |

## ✅ Alterações Implementadas

### 1. ✅ Database Trigger: `create_balance_transaction_on_sale()`
- Taxa da plataforma calculada sobre valor BRUTO
- Comissões calculadas sobre valor líquido (após taxa)
- Migração aplicada com sucesso

### 2. ✅ Edge Function: AppyPay (Angola)
**Arquivo:** `supabase/functions/create-appypay-charge/index.ts`
- Linhas 550-587: Nova lógica implementada
- Taxa primeiro, depois divisão entre afiliado e vendedor

### 3. ✅ Edge Function: SISLOG (Moçambique)
**Arquivo:** `supabase/functions/create-sislog-payment/index.ts`
- Linhas 224-269: Nova lógica implementada
- Taxa primeiro, depois divisão entre afiliado e vendedor

### 4. ✅ Edge Function: Stripe Webhook
**Arquivo:** `supabase/functions/stripe-webhook/index.ts`
- Linhas 741-762 (UPDATE): Nova lógica implementada
- Linhas 781-810 (INSERT): Nova lógica implementada

### 5. ✅ Frontend: Checkout.tsx
**Arquivo:** `src/pages/Checkout.tsx`
- Linhas 1952-1977: Cálculo de display sincronizado com nova lógica

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

## Backward Compatibility
- Vendas antigas mantêm seus valores originais
- Nova lógica aplica-se apenas a vendas futuras
- O trigger verifica se já existem transações antes de processar
