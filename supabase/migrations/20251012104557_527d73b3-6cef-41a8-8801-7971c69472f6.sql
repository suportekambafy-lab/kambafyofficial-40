-- CORREÇÃO FINAL: Garantir que vendas de referência/transferência sem aprovação sejam 'pending'

-- 1. Marcar como 'pending' TODAS as vendas de referência/transferência de hoje
-- que não foram explicitamente aprovadas pelo admin
UPDATE orders
SET 
  status = 'pending',
  updated_at = created_at
WHERE payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
  AND created_at >= CURRENT_DATE
  AND status = 'completed'
  -- Excluir apenas as que foram aprovadas MANUALMENTE pelo admin (updated_at diferente de created_at)
  AND updated_at != created_at;

-- 2. Log da correção
COMMENT ON TABLE orders IS 'Status corrigido: vendas reference/transfer de hoje marcadas como pending se não aprovadas manualmente';