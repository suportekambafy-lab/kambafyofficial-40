
# Plano: Corrigir Registro de Vendas de Afiliados

## Resumo do Problema

Vendas de afiliados não estão sendo registradas corretamente. O código de afiliado não está sendo salvo nas ordens, especialmente para pagamentos de Moçambique (M-Pesa/e-Mola).

---

## Problemas Identificados

### 1. Checkout.tsx - Moçambique (linhas 3074-3075)

```typescript
affiliateCode={affiliateCode}
affiliateCommission={hasAffiliate ? (totalPrice * 0.1) : null}  // ❌ HARDCODED 10%
```

**Problema**: A comissão de afiliado está **hardcoded em 10%**, ignorando a taxa real configurada no banco de dados.

### 2. Falta de Validação do Afiliado para Moçambique

Para Angola (`handlePurchase`, linhas 1825-1858), há validação:
```typescript
const { data: affiliate } = await supabase
  .from('affiliates')
  .select('commission_rate')
  .eq('affiliate_code', affiliateCode)
  .eq('product_id', product.id)
  .eq('status', 'ativo')
  .maybeSingle();
```

Para Moçambique, essa validação **não existe**. O código é passado diretamente sem verificar se é válido.

### 3. Consequência

Se o código de afiliado não for validado antes, e a comissão for `null`, a ordem é salva **sem o código de afiliado**, resultando em venda direta ao invés de venda de afiliado.

---

## Solução Proposta

### Passo 1: Adicionar Estado para Afiliado Validado

Adicionar estados no `Checkout.tsx` para armazenar dados do afiliado validado:

```typescript
const [validatedAffiliate, setValidatedAffiliate] = useState<{
  code: string;
  commission_rate: number;
  commission_amount: number;
} | null>(null);
```

### Passo 2: Validar Afiliado ao Carregar Produto

Quando o produto carregar e houver `affiliateCode`, validar imediatamente:

```typescript
useEffect(() => {
  const validateAffiliate = async () => {
    if (!affiliateCode || !product?.id) return;
    
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('commission_rate, affiliate_user_id')
      .eq('affiliate_code', affiliateCode)
      .eq('product_id', product.id)
      .eq('status', 'ativo')
      .maybeSingle();
    
    if (affiliate) {
      const rate = parseFloat(affiliate.commission_rate.replace('%', '')) / 100;
      const commissionAmount = Math.round(totalPrice * rate * 100) / 100;
      
      setValidatedAffiliate({
        code: affiliateCode,
        commission_rate: rate,
        commission_amount: commissionAmount
      });
      markAsValidAffiliate();
    } else {
      setValidatedAffiliate(null);
      markAsInvalidAffiliate();
      // NÃO limpar código aqui - só limpar após tentativa de pagamento
    }
  };
  
  validateAffiliate();
}, [affiliateCode, product?.id, totalPrice]);
```

### Passo 3: Passar Dados Validados para MozambiquePaymentForm

Alterar linhas 3074-3075:

```typescript
affiliateCode={validatedAffiliate?.code || null}
affiliateCommission={validatedAffiliate?.commission_amount || null}
```

### Passo 4: Recalcular Comissão Quando Preço Mudar

A comissão deve ser recalculada quando o preço total mudar (ex: order bump adicionado):

```typescript
useEffect(() => {
  if (validatedAffiliate && totalPrice > 0) {
    const newCommission = Math.round(totalPrice * validatedAffiliate.commission_rate * 100) / 100;
    setValidatedAffiliate(prev => prev ? {
      ...prev,
      commission_amount: newCommission
    } : null);
  }
}, [totalPrice, validatedAffiliate?.commission_rate]);
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Checkout.tsx` | Adicionar validação de afiliado e estados |

---

## Fluxo Corrigido

```text
1. Usuário acessa checkout com ?ref=CODIGO
   ↓
2. Hook useAffiliateTracking captura código
   ↓
3. Produto carrega
   ↓
4. ✅ NOVO: Validar afiliado no banco (status='ativo', product_id)
   ↓
5. Se válido: armazenar código + taxa + comissão calculada
   ↓
6. Passar dados validados para MozambiquePaymentForm
   ↓
7. create-sislog-payment recebe affiliate_code e affiliate_commission corretos
   ↓
8. Trigger create_balance_transaction_on_sale processa comissão
```

---

## Resultado Esperado

1. ✅ Código de afiliado será validado antes de qualquer pagamento
2. ✅ Comissão será calculada com a taxa real do afiliado
3. ✅ Vendas de Moçambique registrarão corretamente o afiliado
4. ✅ Trigger do banco processará a comissão corretamente

---

## Detalhes Técnicos

### Tabela `affiliates` - Colunas Relevantes
- `affiliate_code`: Código único do afiliado
- `product_id`: Produto ao qual é afiliado
- `status`: 'ativo', 'pendente', 'recusado', etc.
- `commission_rate`: Taxa de comissão (ex: '90%', '50%')
- `affiliate_user_id`: ID do usuário afiliado

### Exemplo de Cálculo
```
Preço: 500 MT
Taxa afiliado: 30%
Comissão afiliado: 500 × 0.30 = 150 MT
Vendedor recebe: 500 × 0.9001 - 150 = 300.05 MT (após taxa plataforma)
```
