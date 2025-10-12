-- ============================================
-- CORREÇÃO PARTE 3: Últimas Funções
-- ============================================

-- 37. get_seller_stats
CREATE OR REPLACE FUNCTION public.get_seller_stats(seller_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'totalSales', COALESCE(
      (SELECT COUNT(*) FROM orders WHERE user_id = seller_id AND status = 'completed'), 0
    ),
    'totalRevenue', COALESCE(
      (SELECT SUM(amount::numeric) FROM orders WHERE user_id = seller_id AND status = 'completed'), 0
    ),
    'totalProducts', COALESCE(
      (SELECT COUNT(*) FROM products WHERE user_id = seller_id), 0
    ),
    'totalCustomers', COALESCE(
      (SELECT COUNT(DISTINCT customer_email) FROM orders WHERE user_id = seller_id AND status = 'completed'), 0
    ),
    'recentOrders', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', id,
          'amount', amount,
          'customer_name', customer_name,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ) FROM (
        SELECT id, amount, customer_name, created_at 
        FROM orders 
        WHERE user_id = seller_id AND status = 'completed'
        ORDER BY created_at DESC 
        LIMIT 5
      ) recent), '[]'::json
    ),
    'monthlyStats', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'month', month_start,
          'sales', sales_count,
          'revenue', total_revenue
        ) ORDER BY month_start
      ) FROM (
        SELECT 
          date_trunc('month', created_at) as month_start,
          COUNT(*) as sales_count,
          SUM(amount::numeric) as total_revenue
        FROM orders 
        WHERE user_id = seller_id 
          AND status = 'completed'
          AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) monthly), '[]'::json
    )
  );
$$;

-- 38. get_all_identity_verifications_for_admin
CREATE OR REPLACE FUNCTION public.get_all_identity_verifications_for_admin()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  full_name text, 
  birth_date date, 
  document_type text, 
  document_number text, 
  document_front_url text, 
  document_back_url text, 
  status text, 
  rejection_reason text, 
  verified_at timestamp with time zone, 
  verified_by uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    iv.id,
    iv.user_id,
    iv.full_name,
    iv.birth_date,
    iv.document_type,
    iv.document_number,
    iv.document_front_url,
    iv.document_back_url,
    iv.status,
    iv.rejection_reason,
    iv.verified_at,
    iv.verified_by,
    iv.created_at,
    iv.updated_at
  FROM public.identity_verification iv
  ORDER BY iv.created_at DESC;
$$;

-- 39. get_all_withdrawal_requests_for_admin
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_for_admin()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  amount numeric, 
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  admin_notes text, 
  admin_processed_by uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    amount,
    status,
    created_at,
    updated_at,
    admin_notes,
    admin_processed_by
  FROM public.withdrawal_requests
  ORDER BY created_at DESC;
$$;

-- 40. get_order_details_for_admin
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
  member_area_url text
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
    ma.url as member_area_url
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  LEFT JOIN member_areas ma ON p.member_area_id = ma.id
  WHERE o.id = p_order_id;
$$;

-- 41. get_pending_transfers_for_admin
CREATE OR REPLACE FUNCTION public.get_pending_transfers_for_admin()
RETURNS TABLE(
  id uuid, 
  order_id text, 
  customer_name text, 
  customer_email text, 
  amount text, 
  currency text, 
  created_at timestamp with time zone, 
  payment_proof_data jsonb, 
  user_id uuid, 
  status text, 
  payment_method text, 
  product_name text
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
    p.name as product_name
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  WHERE o.status = 'pending' 
    AND o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
    AND o.payment_proof_data IS NOT NULL
  ORDER BY o.created_at DESC;
$$;

-- 42. count_duplicate_withdrawals
CREATE OR REPLACE FUNCTION public.count_duplicate_withdrawals()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM (
    SELECT 
      user_id,
      amount,
      COUNT(*) as duplicate_count
    FROM public.withdrawal_requests
    WHERE status = 'pendente'
    GROUP BY user_id, amount
    HAVING COUNT(*) > 1
  ) duplicates;
$$;