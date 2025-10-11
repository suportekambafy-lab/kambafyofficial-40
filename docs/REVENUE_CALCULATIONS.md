# 💰 Cálculo de Receitas - Kambafy

## 📊 Valores Exibidos nas Páginas

Todas as páginas do sistema agora exibem **LUCRO REAL** do vendedor, não o valor total transacionado.

### O que é exibido?

| Página | Métrica | O que Mostra |
|--------|---------|-------------|
| **Dashboard** | Vendas Realizadas | Lucro líquido do vendedor |
| **Vendas** | Vendas Pagas | Lucro líquido do vendedor |
| **Financeiro** | Saldo Disponível | Lucro líquido após 3 dias |

## 🔢 Como o Lucro é Calculado?

### 1. Vendas Próprias (Vendedor = Dono do Produto)

```typescript
// Se houver seller_commission (novo sistema)
lucro = seller_commission  // Já descontada a comissão do afiliado

// Se NÃO houver seller_commission (vendas antigas)
lucro = amount  // Valor total da venda
```

**Exemplo:**
- Venda de 10.000 KZ
- Comissão do afiliado: 10% = 1.000 KZ
- **Lucro do vendedor**: 9.000 KZ ← Este valor é exibido

### 2. Vendas como Afiliado (Vendedor = Afiliado de outro produto)

```typescript
lucro = affiliate_commission  // Apenas a comissão que ele recebe
```

**Exemplo:**
- Venda de 10.000 KZ (produto de outro vendedor)
- Comissão do afiliado: 10% = 1.000 KZ
- **Lucro do afiliado**: 1.000 KZ ← Este valor é exibido

### 3. Vendas de Módulos (Member Areas)

```typescript
// Após descontar taxa da plataforma (8%)
lucro = amount * 0.92  // 92% do valor vai para o vendedor
```

**Exemplo:**
- Pagamento de módulo: 5.000 KZ
- Taxa da plataforma (8%): 400 KZ
- **Lucro do vendedor**: 4.600 KZ ← Este valor é exibido
- **Incluído no Financeiro**: ✅ SIM (após conclusão do pagamento)

## 📈 Fluxo de Dados

```
┌─────────────────────┐     ┌──────────────────────┐
│   Orders Table      │     │  Module Payments     │
│                     │     │                      │
│ • amount            │     │ • amount             │
│ • seller_comm.      │     │ • status             │
│ • affiliate_c.      │     │ • member_area_id     │
└──────────┬──────────┘     └──────────┬───────────┘
           │                           │
           │    Trigger on INSERT/UPDATE (status='completed')
           │                           │
           ├───────────────────────────┴─► balance_transactions
           │                               │
           │                               │ • platform_fee (-8%)
           │                               │ • sale_revenue (+92%)
           │                               │
           ▼                               ▼
┌─────────────────┐              ┌─────────────────┐
│ useStreamingQ.  │◄─────────────│customer_balances│
│                 │              │                 │
│ stats.paidTotal │              │ balance (soma)  │
└────────┬────────┘              └─────────────────┘
         │
         ├────────► Dashboard
         ├────────► Vendas
         └────────► Financeiro
```

## ⚖️ Por que mostrar Lucro e não Valor Total?

### ✅ Vantagens

1. **Transparência Real**: Vendedor vê exatamente quanto vai receber
2. **Consistência**: Todos os dashboards mostram o mesmo valor
3. **Expectativas Corretas**: Não há surpresa ao fazer saque
4. **Alinhamento com Financeiro**: Saldo disponível = soma dos lucros
5. **Inclui Módulos**: Vendas de módulos pagos também aparecem no financeiro (8% de taxa)

### ❌ Se mostrássemos Valor Total

- Dashboard: 10.000 KZ (valor total)
- Financeiro: 9.000 KZ (após descontar afiliado)
- ⚠️ **Confusão**: "Onde foram meus 1.000 KZ?"

## 🔍 Debugging - Como Verificar

### No Console do Navegador

Quando carrega a página de Vendas, você verá:

```
📊 STATS INPUT DATA: {
  ownSales: 112,
  moduleSales: 2,
  affiliateSales: 0,
  total: 114
}

📊 RESUMO FINAL DAS STATS: {
  totalVendas: 114,
  paid: 112,
  paidTotal: 8421579,  ← LUCRO REAL
  ...
  nota: 'paidTotal representa LUCRO REAL do vendedor'
}

🔍 DETALHAMENTO POR STATUS:
  ✅ Completed: 112 vendas, lucro real: 8421579.00 KZ
```

### Comparando Dashboard vs Vendas

**Antes da correção:**
- Dashboard: 8.421.579 KZ (usando earning_amount)
- Vendas: 8.160.311 KZ (usando amount)
- ❌ Diferença: 261.268 KZ

**Depois da correção:**
- Dashboard: 8.421.579 KZ (usando earning_amount)
- Vendas: 8.421.579 KZ (usando seller_commission)
- ✅ **Iguais!**

## 📝 Código Fonte

### useStreamingQuery.ts (linhas 173-223)

```typescript
const stats = (statsData || []).reduce((acc, order) => {
  const isAffiliateEarning = userAffiliateCodes.includes(order.affiliate_code);
  
  if (isAffiliateEarning) {
    // Vendas como afiliado - apenas comissão
    const affiliateCommission = parseFloat(order.affiliate_commission?.toString() || '0');
    acc.paidTotal += affiliateCommission;
  } else {
    // Vendas próprias - seller_commission (ou amount para vendas antigas)
    let sellerEarning = parseFloat(order.seller_commission?.toString() || '0');
    
    if (sellerEarning === 0) {
      sellerEarning = parseFloat(order.amount || '0');
    }
    
    acc.paidTotal += sellerEarning;
  }
  
  return acc;
}, { ... });
```

### ModernDashboardHome.tsx (linhas 270-274)

```typescript
const totalRevenue = filteredOrders.reduce((sum, order) => {
  // earning_amount já foi calculado baseado no tipo de venda
  const amount = order.earning_amount || parseFloat(order.amount) || 0;
  return sum + amount;
}, 0);
```

## 🚨 Importante para Desenvolvedores

1. **NUNCA use `amount` direto para calcular ganhos**
   - Use `seller_commission` para vendas próprias
   - Use `affiliate_commission` para vendas como afiliado
   - Para módulos: `amount * 0.92` (já descontados 8%)

2. **Para vendas antigas sem comissões**
   - Fallback para `amount` se `seller_commission === 0`

3. **Vendas de Módulos**
   - Trigger automático cria `balance_transactions` quando status = 'completed'
   - Taxa de 8% aplicada automaticamente via `create_balance_transaction_on_module_payment()`
   - Aparecem automaticamente no Financeiro

4. **Testes**
   - Sempre verifique que Dashboard = Vendas = Financeiro
   - Use console.log para debug
   - Verificar que módulos completados aparecem no saldo

## 📊 Exemplos de Casos Reais

### Caso 1: Victor Muabi

**Vendas Próprias:**
- 112 vendas completed
- Algumas com afiliados (desconto de comissão)
- Algumas sem afiliados (valor total)

**Total:**
- Dashboard: 8.421.579 KZ ✅
- Vendas: 8.421.579 KZ ✅
- **Consistente!**

### Caso 2: Dário

**Vendas Próprias:**
- 112 vendas completed
- Sem afiliados
- Sem módulos

**Total:**
- Dashboard: 270.100 KZ ✅
- Vendas: 270.100 KZ ✅
- **Consistente!**

## 🔄 Histórico de Mudanças

### v1.0 (Antes)
- Dashboard: usava `earning_amount`
- Vendas: usava `amount` direto
- ❌ Valores diferentes

### v2.0 (2025-10-09)
- Dashboard: usa `earning_amount`
- Vendas: usa `seller_commission` (mesmo cálculo)
- ✅ Valores iguais

### v2.1 (2025-10-11) 
- ✅ **Vendas de Módulos incluídas no Financeiro**
- Trigger automático: `create_balance_transaction_on_module_payment()`
- Taxa de 8% aplicada a módulos (consistente com vendas normais)
- `balance_transactions` criadas automaticamente ao completar pagamento
- Saldo disponível agora inclui lucro de módulos pagos

---

**Data:** 2025-10-11  
**Versão:** 2.1  
**Status:** ✅ Corrigido, Testado e Documentado
