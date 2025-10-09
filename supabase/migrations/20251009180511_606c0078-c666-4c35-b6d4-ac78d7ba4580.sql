-- Remover pedidos de saque duplicados
-- Mantém apenas o pedido mais recente de cada usuário com mesmo valor e status pendente

-- Criar uma tabela temporária com os IDs dos registros a manter
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    amount,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, amount, status 
      ORDER BY created_at DESC
    ) as rn
  FROM public.withdrawal_requests
  WHERE status = 'pendente'
)
-- Deletar todos os duplicados, mantendo apenas o mais recente (rn = 1)
DELETE FROM public.withdrawal_requests
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);