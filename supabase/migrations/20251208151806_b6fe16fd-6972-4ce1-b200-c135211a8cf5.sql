-- Fix SECURITY DEFINER functions missing search_path
-- This prevents potential SQL injection via schema hijacking

-- 1. count_duplicate_withdrawals
CREATE OR REPLACE FUNCTION public.count_duplicate_withdrawals()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. get_all_identity_verifications_for_admin
CREATE OR REPLACE FUNCTION public.get_all_identity_verifications_for_admin()
 RETURNS TABLE(id uuid, user_id uuid, full_name text, birth_date date, document_type text, document_number text, document_front_url text, document_back_url text, status text, rejection_reason text, verified_at timestamp with time zone, verified_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 3. get_all_withdrawal_requests_for_admin
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_for_admin()
 RETURNS TABLE(id uuid, user_id uuid, amount numeric, status text, created_at timestamp with time zone, updated_at timestamp with time zone, admin_notes text, admin_processed_by uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 4. get_order_details_for_admin
CREATE OR REPLACE FUNCTION public.get_order_details_for_admin(p_order_id uuid)
 RETURNS TABLE(id uuid, order_id text, customer_name text, customer_email text, amount text, currency text, status text, payment_method text, user_id uuid, product_id uuid, order_bump_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, product_name text, product_type text, product_share_link text, product_member_area_id uuid, product_user_id uuid, product_access_duration_type text, product_access_duration_value integer, member_area_url text, seller_commission text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- 5. get_seller_stats
CREATE OR REPLACE FUNCTION public.get_seller_stats(seller_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 6. is_current_user_admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    WHERE au.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND au.is_active = true
  );
$function$;

-- 7. is_suspicious_ip
CREATE OR REPLACE FUNCTION public.is_suspicious_ip(_user_id uuid, _ip_address text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Verifica se é um IP completamente novo para o usuário
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.security_events 
    WHERE user_id = _user_id 
      AND ip_address = _ip_address
      AND created_at > (now() - INTERVAL '90 days')
  );
$function$;

-- 8. is_trusted_device
CREATE OR REPLACE FUNCTION public.is_trusted_device(_user_id uuid, _device_fingerprint text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.trusted_devices 
    WHERE user_id = _user_id 
      AND device_fingerprint = _device_fingerprint 
      AND expires_at > now()
  );
$function$;

-- 9. log_api_usage
CREATE OR REPLACE FUNCTION public.log_api_usage(_partner_id uuid, _endpoint text, _method text, _status_code integer, _response_time_ms integer DEFAULT NULL::integer, _ip_address text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.api_usage_logs (
    partner_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    user_agent
  ) VALUES (
    _partner_id,
    _endpoint,
    _method,
    _status_code,
    _response_time_ms,
    _ip_address,
    _user_agent
  );
END;
$function$;

-- 10. process_recovery_fee
CREATE OR REPLACE FUNCTION public.process_recovery_fee(_abandoned_purchase_id uuid, _order_id text, _fee_percentage numeric DEFAULT 20.0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fee_record_id UUID;
  purchase_record RECORD;
  fee_amount NUMERIC;
  seller_net_amount NUMERIC;
BEGIN
  -- Buscar dados do carrinho abandonado
  SELECT ap.*, p.user_id as seller_user_id 
  INTO purchase_record
  FROM abandoned_purchases ap
  JOIN products p ON ap.product_id = p.id
  WHERE ap.id = _abandoned_purchase_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carrinho abandonado não encontrado';
  END IF;
  
  -- Calcular taxa e valor líquido
  fee_amount := purchase_record.amount * (_fee_percentage / 100.0);
  seller_net_amount := purchase_record.amount - fee_amount;
  
  -- Registrar taxa da Kambafy (negativa para o vendedor)
  INSERT INTO public.balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  ) VALUES (
    purchase_record.seller_user_id,
    'kambafy_fee',
    -fee_amount,
    purchase_record.currency,
    'Taxa da plataforma Kambafy (20%) - Venda Recuperada',
    _order_id
  );
  
  -- Registrar valor líquido para o vendedor
  INSERT INTO public.balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  ) VALUES (
    purchase_record.seller_user_id,
    'sale_revenue',
    seller_net_amount,
    purchase_record.currency,
    'Receita de venda recuperada (valor líquido)',
    _order_id
  );
  
  -- Registrar a taxa para controle
  INSERT INTO public.recovery_fees (
    abandoned_purchase_id,
    seller_user_id,
    order_id,
    recovery_amount,
    fee_amount,
    fee_percentage,
    currency
  ) VALUES (
    _abandoned_purchase_id,
    purchase_record.seller_user_id,
    _order_id,
    purchase_record.amount,
    fee_amount,
    _fee_percentage,
    purchase_record.currency
  ) RETURNING id INTO fee_record_id;
  
  RETURN fee_record_id;
END;
$function$;

-- 11. send_external_payment_webhook
CREATE OR REPLACE FUNCTION public.send_external_payment_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  partner_record RECORD;
  webhook_payload JSONB;
BEGIN
  -- Só enviar webhook quando status mudar para completed ou failed
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('completed', 'failed')) THEN
    
    -- Buscar dados do parceiro
    SELECT * INTO partner_record
    FROM public.partners
    WHERE id = NEW.partner_id;
    
    -- Se tem webhook_url configurado, preparar para envio
    IF partner_record.webhook_url IS NOT NULL THEN
      
      -- Construir payload do webhook
      webhook_payload := jsonb_build_object(
        'event', CASE 
          WHEN NEW.status = 'completed' THEN 'payment.completed'
          WHEN NEW.status = 'failed' THEN 'payment.failed'
          ELSE 'payment.updated'
        END,
        'timestamp', NOW(),
        'data', jsonb_build_object(
          'id', NEW.id,
          'orderId', NEW.order_id,
          'transactionId', NEW.appypay_transaction_id,
          'amount', NEW.amount,
          'currency', NEW.currency,
          'paymentMethod', NEW.payment_method,
          'status', NEW.status,
          'customerName', NEW.customer_name,
          'customerEmail', NEW.customer_email,
          'customerPhone', NEW.customer_phone,
          'referenceEntity', NEW.reference_entity,
          'referenceNumber', NEW.reference_number,
          'completedAt', NEW.completed_at,
          'createdAt', NEW.created_at,
          'metadata', NEW.metadata
        )
      );
      
      -- Marcar para envio (a edge function vai processar)
      NEW.webhook_sent := false;
      NEW.webhook_attempts := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 12. sync_user_email
CREATE OR REPLACE FUNCTION public.sync_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando inserir um novo profile, copiar o email do auth.users
  IF TG_OP = 'INSERT' THEN
    NEW.email := (SELECT email FROM auth.users WHERE id = NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 13. update_comment_likes_count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
    UPDATE public.community_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN
    UPDATE public.community_comments
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- 14. update_post_comments_count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- 15. update_post_likes_count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$function$;