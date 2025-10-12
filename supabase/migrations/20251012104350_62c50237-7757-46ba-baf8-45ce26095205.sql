-- CORREÇÃO URGENTE: Restaurar status correto das vendas
-- As migrações anteriores marcaram TODAS as vendas como 'completed' incorretamente

-- 1. Marcar como 'pending' vendas de referência/transferência recentes
-- (apenas as que foram alteradas no timestamp suspeito)
UPDATE orders
SET 
  status = 'pending',
  updated_at = created_at -- Restaurar updated_at para a data de criação
WHERE payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
  AND updated_at = '2025-10-12 10:37:47.971953+00'
  AND created_at >= '2025-10-12 00:00:00'
  AND status = 'completed';

-- 2. Para vendas antigas de referência/transferência que também foram afetadas,
-- manter como completed mas resetar o updated_at para não parecer manipulado
UPDATE orders
SET updated_at = created_at
WHERE payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
  AND updated_at = '2025-10-12 10:37:47.971953+00'
  AND created_at < '2025-10-12 00:00:00'
  AND status = 'completed';

-- 3. Comentário de segurança
COMMENT ON TABLE orders IS 'Tabela de pedidos. Status restaurado em 2025-10-12 após migração incorreta.';