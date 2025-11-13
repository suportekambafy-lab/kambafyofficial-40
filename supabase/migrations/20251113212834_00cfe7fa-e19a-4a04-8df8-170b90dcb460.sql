-- Atualizar função get_order_details_for_admin para incluir seller_commission
CREATE OR REPLACE FUNCTION public.get_order_details_for_admin(p_order_id uuid)
RETURNS TABLE(
  id uuid,
  order_id text,
  customer_name text,
  customer_email text,
  amount text,
  currency text,
  status text,
  payment_method text,
  user_id uuid,
  product_id uuid,
  order_bump_data jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  product_name text,
  product_type text,
  product_share_link text,
  product_member_area_id uuid,
  product_user_id uuid,
  product_access_duration_type text,
  product_access_duration_value integer,
  member_area_url text,
  seller_commission text
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT 
    o.id,
    o.order_id,
    o.customer_name,
    o.customer_email,
    o.amount,
    o.currency,
    o.status,
    o.payment_method,
    o.user_id,
    o.product_id,
    o.order_bump_data,
    o.created_at,
    o.updated_at,
    p.name as product_name,
    p.type as product_type,
    p.share_link as product_share_link,
    p.member_area_id as product_member_area_id,
    p.user_id as product_user_id,
    p.access_duration_type as product_access_duration_type,
    p.access_duration_value as product_access_duration_value,
    ma.url as member_area_url,
    o.seller_commission
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  LEFT JOIN member_areas ma ON p.member_area_id = ma.id
  WHERE o.id = p_order_id;
$function$;