-- Create secure RPC to delete a product only when there are no paid sales
-- This avoids FK errors with orders_product_id_fkey and bypasses RLS safely.

CREATE OR REPLACE FUNCTION public.delete_product_if_no_paid_sales(
  p_product_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid;
BEGIN
  -- Ensure product exists and belongs to current user
  SELECT user_id
    INTO v_owner_user_id
  FROM public.products
  WHERE id = p_product_id;

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  IF v_owner_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para excluir este produto';
  END IF;

  -- Block deletion if there are paid/completed orders
  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE product_id = p_product_id
      AND status IN ('paid', 'completed')
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'PRODUTO_COM_VENDAS_PAGAS';
  END IF;

  -- Clean up dependencies that can block product deletion
  DELETE FROM public.refund_requests WHERE product_id = p_product_id;

  -- order_bump_settings has a FK on bump_product_id with NO ACTION
  DELETE FROM public.order_bump_settings WHERE bump_product_id = p_product_id;

  -- Remove any non-paid/non-completed orders referencing this product
  -- (orders.product_id is NOT NULL and the FK is NO ACTION)
  DELETE FROM public.orders WHERE product_id = p_product_id;

  -- Finally delete the product (other dependencies are mostly ON DELETE CASCADE)
  DELETE FROM public.products WHERE id = p_product_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_product_if_no_paid_sales(uuid) TO authenticated;