-- Arquivar produtos de Victor Muabi (user_id: a349acdf-584c-441e-adf8-d4bbfe217254)
-- Isso remove da lista de produtos do vendedor mas mantém vendas e faturamento intactos

UPDATE products 
SET status = 'Arquivado', updated_at = now()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';