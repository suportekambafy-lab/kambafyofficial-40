-- Corrigir venda pendente que deveria estar completa (mais de 5 dias)
UPDATE orders 
SET status = 'completed', updated_at = now()
WHERE id = 'bf2164a6-c5a7-4ab9-a87b-6c6455849700' 
  AND status = 'pending' 
  AND created_at < now() - INTERVAL '1 day';