
-- Criar função para corrigir acessos faltantes
CREATE OR REPLACE FUNCTION public.create_customer_access_manual(
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_product_id UUID,
  p_order_id TEXT,
  p_access_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_id UUID;
BEGIN
  INSERT INTO public.customer_access (
    customer_email,
    customer_name,
    product_id,
    order_id,
    is_active,
    access_expires_at
  ) VALUES (
    LOWER(TRIM(p_customer_email)),
    p_customer_name,
    p_product_id,
    p_order_id,
    true,
    p_access_expires_at
  )
  ON CONFLICT (customer_email, product_id) DO UPDATE SET
    is_active = true,
    order_id = EXCLUDED.order_id,
    updated_at = NOW()
  RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$;
