-- Corrigir produtos com inconsistência entre admin_approved e status
-- Produtos aprovados (admin_approved = true) devem estar Ativos
UPDATE products 
SET 
  status = 'Ativo',
  updated_at = now()
WHERE 
  admin_approved = true 
  AND status != 'Ativo' 
  AND status != 'Banido'  -- Não alterar produtos banidos
  AND status != 'Em Revisão';  -- Não alterar produtos em revisão

-- Adicionar comentário
COMMENT ON COLUMN products.status IS 'Status do produto: Rascunho, Pendente, Ativo, Inativo, Banido, Em Revisão';