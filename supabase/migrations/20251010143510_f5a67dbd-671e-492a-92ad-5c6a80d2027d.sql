-- Alterar valor padrão de admin_approved para false
ALTER TABLE public.products 
ALTER COLUMN admin_approved SET DEFAULT false;

-- Atualizar produtos existentes que estão pendentes mas marcados como aprovados
UPDATE public.products 
SET admin_approved = false 
WHERE status = 'Pendente' 
AND admin_approved = true;