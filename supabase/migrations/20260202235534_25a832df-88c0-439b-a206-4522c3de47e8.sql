-- 1. Criar política para permitir leitura pública de perfis (apenas para exibição do nome do vendedor)
-- Isso é necessário para a página de obrigado mostrar o nome do vendedor

CREATE POLICY "Public can view seller profiles for products"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.user_id = profiles.user_id 
    AND p.status = 'Ativo'
  )
);

-- 2. Criar RPC para marcar compra abandonada como recuperada (bypass RLS de forma segura)
CREATE OR REPLACE FUNCTION public.mark_abandoned_purchase_recovered(
  p_customer_email TEXT,
  p_product_id UUID,
  p_recovered_order_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.abandoned_purchases
  SET 
    status = 'recovered',
    recovered_at = NOW(),
    recovered_order_id = p_recovered_order_id,
    updated_at = NOW()
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
    AND status = 'abandoned';
  
  RETURN FOUND;
END;
$$;