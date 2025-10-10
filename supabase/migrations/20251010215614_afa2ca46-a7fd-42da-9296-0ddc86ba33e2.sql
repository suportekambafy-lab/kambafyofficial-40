-- Remove a função duplicada com JWT
DROP FUNCTION IF EXISTS public.admin_approve_product(uuid, uuid, text, text);

-- Garantir que apenas a função sem JWT existe
-- (a função sem JWT já existe conforme a configuração atual)