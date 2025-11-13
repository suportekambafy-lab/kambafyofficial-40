-- Dropar função existente
DROP FUNCTION IF EXISTS public.get_pending_transfers_for_admin();

-- Recriar função com product_id e payment_proof_hash
CREATE FUNCTION public.get_pending_transfers_for_admin()
RETURNS TABLE(
  id uuid,
  order_id text,
  customer_name text,
  customer_email text,
  amount text,
  currency text,
  created_at timestamptz,
  payment_proof_data jsonb,
  user_id uuid,
  status text,
  payment_method text,
  product_name text,
  product_id uuid,
  payment_proof_hash text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.order_id,
    o.customer_name,
    o.customer_email,
    o.amount,
    o.currency,
    o.created_at,
    o.payment_proof_data,
    o.user_id,
    o.status,
    o.payment_method,
    p.name as product_name,
    o.product_id,
    o.payment_proof_hash
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  WHERE o.status = 'pending' 
    AND o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
    AND o.payment_proof_data IS NOT NULL
  ORDER BY o.created_at DESC;
$$;