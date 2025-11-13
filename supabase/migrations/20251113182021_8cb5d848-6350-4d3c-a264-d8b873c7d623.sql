-- ================================
-- FASE 1: Sistema Anti-Duplicação de Comprovativos
-- ================================

-- Adicionar coluna para hash SHA-256 do comprovativo
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_hash TEXT;

-- Comentário explicativo
COMMENT ON COLUMN orders.payment_proof_hash IS 'Hash SHA-256 do arquivo de comprovativo para detectar duplicatas';

-- Adicionar índice para busca rápida de hash
CREATE INDEX IF NOT EXISTS idx_orders_proof_hash 
ON orders(payment_proof_hash) 
WHERE payment_proof_hash IS NOT NULL;

-- Índice para buscar pedidos aprovados com hash duplicado
CREATE INDEX IF NOT EXISTS idx_orders_completed_proof_hash 
ON orders(payment_proof_hash, status) 
WHERE status = 'completed' AND payment_proof_hash IS NOT NULL;

-- Índice para buscar múltiplos pedidos do mesmo email
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_status 
ON orders(customer_email, status, created_at) 
WHERE status IN ('pending', 'completed');

-- ================================
-- IMPORTANTE: Não criamos unique constraint para permitir
-- que admin aprove manualmente casos legítimos se necessário
-- ================================