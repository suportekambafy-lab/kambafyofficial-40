-- Ativar produtos que estão inativos do marketplace (admin_approved = false)
-- mas que NÃO foram banidos (status != 'Banido')
-- Estes produtos devem ter admin_approved = true para aparecer no marketplace

UPDATE products 
SET admin_approved = true, updated_at = now()
WHERE admin_approved = false 
  AND status NOT IN ('Banido', 'banned')
  AND status IN ('Publicado', 'published', 'Ativo', 'active');

-- Confirmar quantos foram atualizados
-- SELECT COUNT(*) FROM products WHERE admin_approved = true;