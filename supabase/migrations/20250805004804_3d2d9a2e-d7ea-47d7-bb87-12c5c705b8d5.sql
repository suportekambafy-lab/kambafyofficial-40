-- Atualizar status padrão dos produtos para "Aprovado" e admin_approved para true
UPDATE products 
SET status = 'Ativo', admin_approved = true 
WHERE status = 'Ativo' AND admin_approved = false;

-- Alterar valor padrão da coluna admin_approved para true
ALTER TABLE products ALTER COLUMN admin_approved SET DEFAULT true;

-- Adicionar coluna para controlar se vendedor pediu revisão
ALTER TABLE products ADD COLUMN IF NOT EXISTS revision_requested boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS revision_requested_at timestamp with time zone;