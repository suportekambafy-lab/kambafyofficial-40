-- Remover política RLS que não é mais necessária
DROP POLICY IF EXISTS "Admins can update admin_approved field" ON public.products;