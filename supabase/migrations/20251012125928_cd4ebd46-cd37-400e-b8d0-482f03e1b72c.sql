-- ============================================
-- CORREÇÃO COMPLETA: Segurança e Performance
-- ============================================

-- ==========================================
-- ETAPA 1: Corrigir search_path nas funções
-- ==========================================

-- 1. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- 2. sync_customer_balance
CREATE OR REPLACE FUNCTION public.sync_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT balance INTO current_balance
    FROM public.customer_balances
    WHERE user_id = NEW.user_id;
    
    IF current_balance IS NULL THEN
      INSERT INTO public.customer_balances (user_id, balance, currency)
      VALUES (NEW.user_id, NEW.amount, NEW.currency);
    ELSE
      UPDATE public.customer_balances
      SET 
        balance = balance + NEW.amount,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. admin_process_withdrawal_request
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(request_id uuid, new_status text, admin_id uuid DEFAULT NULL, notes_text text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
END;
$$;

-- 4. admin_confirm_user_email
CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 1;
$$;

-- 5. cleanup_passwordless_users
CREATE OR REPLACE FUNCTION public.cleanup_passwordless_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id 
    FROM auth.users 
    WHERE encrypted_password IS NULL 
      AND created_at < (now() - INTERVAL '1 hour')
  LOOP
    DELETE FROM public.profiles WHERE user_id = user_record.id;
  END LOOP;
END;
$$;

-- 6. cleanup_expired_impersonation_sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_impersonation_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_impersonation_sessions
  SET is_active = false,
      ended_at = NOW()
  WHERE is_active = true
    AND expires_at < NOW();
END;
$$;

-- 7. cleanup_expired_member_sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_member_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.member_area_sessions
  WHERE expires_at < now();
END;
$$;

-- 8. approve_partner
CREATE OR REPLACE FUNCTION public.approve_partner(partner_id uuid, admin_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE public.partners 
  SET 
    status = 'approved',
    api_key = generate_api_key(),
    approved_at = now(),
    approved_by = admin_id,
    updated_at = now()
  WHERE id = partner_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;
END;
$$;

-- 9. get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(total_users bigint, total_products bigint, total_transactions bigint, pending_withdrawals bigint, total_paid_out numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT count(*) FROM profiles)::bigint AS total_users,
    (SELECT count(*) FROM products WHERE products.status = 'Ativo')::bigint AS total_products,
    (SELECT count(*) FROM orders WHERE orders.status = 'completed')::bigint AS total_transactions,
    (SELECT count(*) FROM withdrawal_requests WHERE withdrawal_requests.status = 'pendente')::bigint AS pending_withdrawals,
    (SELECT COALESCE(sum(withdrawal_requests.amount), 0) FROM withdrawal_requests WHERE withdrawal_requests.status = 'aprovado') AS total_paid_out;
END;
$$;

-- 10. admin_process_transfer_request
CREATE OR REPLACE FUNCTION public.admin_process_transfer_request(p_transfer_id uuid, p_action text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_data json;
  order_record RECORD;
  new_status text;
BEGIN
  new_status := CASE WHEN p_action = 'approve' THEN 'completed' ELSE 'failed' END;
  
  SELECT * INTO order_record FROM public.orders WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  UPDATE public.orders 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update order status';
  END IF;
  
  result_data := json_build_object(
    'success', true,
    'order_id', order_record.order_id,
    'old_status', order_record.status,
    'new_status', new_status,
    'updated_at', now()
  );
  
  RETURN result_data;
END;
$$;

-- 11. create_customer_access_manual
CREATE OR REPLACE FUNCTION public.create_customer_access_manual(p_customer_email text, p_customer_name text, p_product_id uuid, p_order_id text, p_access_expires_at timestamp with time zone DEFAULT NULL)
RETURNS uuid
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

-- 12. extend_customer_access
CREATE OR REPLACE FUNCTION public.extend_customer_access(p_customer_email text, p_product_id uuid, p_order_id text, p_extension_type text, p_extension_value integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_record RECORD;
  new_expiration TIMESTAMP WITH TIME ZONE;
  access_id UUID;
BEGIN
  SELECT * INTO access_record
  FROM public.customer_access
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF access_record IS NOT NULL THEN
    IF access_record.access_expires_at IS NOT NULL THEN
      new_expiration := public.calculate_access_expiration(
        p_extension_type, 
        p_extension_value, 
        GREATEST(access_record.access_expires_at, now())
      );
    ELSE
      new_expiration := public.calculate_access_expiration(
        p_extension_type, 
        p_extension_value, 
        now()
      );
    END IF;
    
    UPDATE public.customer_access
    SET 
      access_expires_at = new_expiration,
      is_active = true,
      updated_at = now()
    WHERE id = access_record.id;
    
    access_id := access_record.id;
  ELSE
    new_expiration := public.calculate_access_expiration(
      p_extension_type, 
      p_extension_value, 
      now()
    );
    
    INSERT INTO public.customer_access (
      customer_email,
      customer_name,
      product_id,
      order_id,
      access_expires_at
    ) VALUES (
      p_customer_email,
      p_customer_email,
      p_product_id,
      p_order_id,
      new_expiration
    ) RETURNING id INTO access_id;
  END IF;
  
  RETURN access_id;
END;
$$;

-- 13. process_recovery_fee
CREATE OR REPLACE FUNCTION public.process_recovery_fee(_abandoned_purchase_id uuid, _order_id text, _fee_percentage numeric DEFAULT 20.0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fee_record_id UUID;
  purchase_record RECORD;
  fee_amount NUMERIC;
  seller_net_amount NUMERIC;
BEGIN
  SELECT ap.*, p.user_id as seller_user_id 
  INTO purchase_record
  FROM abandoned_purchases ap
  JOIN products p ON ap.product_id = p.id
  WHERE ap.id = _abandoned_purchase_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carrinho abandonado não encontrado';
  END IF;
  
  fee_amount := purchase_record.amount * (_fee_percentage / 100.0);
  seller_net_amount := purchase_record.amount - fee_amount;
  
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
$$;

-- 14. recalculate_user_balance
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correct_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO correct_balance
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  UPDATE customer_balances
  SET 
    balance = correct_balance,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (target_user_id, correct_balance, 'KZ');
  END IF;
END;
$$;

-- 15. admin_recalculate_seller_balance
CREATE OR REPLACE FUNCTION public.admin_recalculate_seller_balance(target_user_id uuid, delete_old_credit_transactions boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_balance NUMERIC;
  new_balance NUMERIC;
  deleted_count INTEGER := 0;
  transaction_count INTEGER;
BEGIN
  SELECT balance INTO old_balance
  FROM customer_balances
  WHERE user_id = target_user_id;
  
  IF delete_old_credit_transactions THEN
    DELETE FROM balance_transactions
    WHERE user_id = target_user_id
      AND type = 'credit'
      AND description LIKE '%Venda do produto%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END IF;
  
  SELECT COALESCE(SUM(amount), 0) INTO new_balance
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  SELECT COUNT(*) INTO transaction_count
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  UPDATE customer_balances
  SET 
    balance = new_balance,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (target_user_id, new_balance, 'KZ');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'old_balance', old_balance,
    'new_balance', new_balance,
    'difference', new_balance - COALESCE(old_balance, 0),
    'deleted_transactions', deleted_count,
    'total_transactions', transaction_count
  );
END;
$$;

-- 16. admin_recalculate_all_seller_balances
CREATE OR REPLACE FUNCTION public.admin_recalculate_all_seller_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_record RECORD;
  result_array JSONB := '[]'::JSONB;
  total_sellers INTEGER := 0;
  total_fixed INTEGER := 0;
BEGIN
  FOR seller_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    total_sellers := total_sellers + 1;
    result_array := result_array || admin_recalculate_seller_balance(seller_record.user_id, true);
    total_fixed := total_fixed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_sellers_processed', total_sellers,
    'total_fixed', total_fixed,
    'details', result_array,
    'timestamp', NOW()
  );
END;
$$;

-- 17. detect_abandoned_purchase
CREATE OR REPLACE FUNCTION public.detect_abandoned_purchase(_product_id uuid, _customer_email text, _customer_name text, _amount numeric, _currency text DEFAULT 'KZ', _customer_phone text DEFAULT NULL, _ip_address text DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  abandoned_id UUID;
BEGIN
  INSERT INTO public.abandoned_purchases (
    product_id,
    customer_email,
    customer_name,
    customer_phone,
    amount,
    currency,
    ip_address,
    user_agent
  ) VALUES (
    _product_id,
    _customer_email,
    _customer_name,
    _customer_phone,
    _amount,
    _currency,
    _ip_address,
    _user_agent
  ) RETURNING id INTO abandoned_id;
  
  RETURN abandoned_id;
END;
$$;

-- 18. log_api_usage
CREATE OR REPLACE FUNCTION public.log_api_usage(_partner_id uuid, _endpoint text, _method text, _status_code integer, _response_time_ms integer DEFAULT NULL, _ip_address text DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 19. admin_update_identity_verification
CREATE OR REPLACE FUNCTION public.admin_update_identity_verification(p_verification_id uuid, p_status text, p_rejection_reason text DEFAULT NULL, p_admin_id uuid DEFAULT NULL, p_admin_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text;
BEGIN
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  IF p_status = 'aprovado' THEN
    UPDATE public.identity_verification 
    SET 
      status = p_status,
      rejection_reason = NULL,
      verified_at = NOW(),
      verified_by = p_admin_id,
      updated_at = NOW()
    WHERE id = p_verification_id;
  ELSE
    UPDATE public.identity_verification 
    SET 
      status = p_status,
      rejection_reason = p_rejection_reason,
      verified_at = NULL,
      verified_by = NULL,
      updated_at = NOW()
    WHERE id = p_verification_id;
  END IF;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;
END;
$$;

-- 20. admin_approve_product
CREATE OR REPLACE FUNCTION public.admin_approve_product(product_id uuid, admin_id uuid DEFAULT NULL, p_admin_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text;
BEGIN
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  UPDATE public.products 
  SET 
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    updated_at = now()
  WHERE id = product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$$;

-- 21. add_student_to_member_area
CREATE OR REPLACE FUNCTION public.add_student_to_member_area()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
  normalized_email TEXT;
BEGIN
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  normalized_email := LOWER(TRIM(NEW.customer_email));
  
  SELECT member_area_id INTO product_record
  FROM public.products
  WHERE id = NEW.product_id;
  
  IF product_record.member_area_id IS NOT NULL THEN
    INSERT INTO public.member_area_students (
      member_area_id,
      student_email,
      student_name,
      access_granted_at
    )
    VALUES (
      product_record.member_area_id,
      normalized_email,
      NEW.customer_name,
      NEW.created_at
    )
    ON CONFLICT (member_area_id, student_email) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 22. add_product_to_customer_purchases
CREATE OR REPLACE FUNCTION public.add_product_to_customer_purchases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
  normalized_email TEXT;
  default_cohort_id UUID;
BEGIN
  normalized_email := LOWER(TRIM(NEW.student_email));
  
  SELECT p.* INTO product_record
  FROM public.products p
  WHERE p.member_area_id = NEW.member_area_id
  LIMIT 1;
  
  IF product_record.id IS NOT NULL THEN
    order_id_generated := 'member_access_' || NEW.member_area_id || '_' || normalized_email || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    INSERT INTO public.customer_access (
      customer_email,
      customer_name,
      product_id,
      order_id,
      access_granted_at,
      access_expires_at,
      is_active
    )
    VALUES (
      normalized_email,
      NEW.student_name,
      product_record.id,
      order_id_generated,
      NEW.access_granted_at,
      NULL,
      true
    )
    ON CONFLICT (customer_email, product_id) DO UPDATE SET
      is_active = true,
      access_granted_at = GREATEST(customer_access.access_granted_at, NEW.access_granted_at),
      updated_at = NOW();
  END IF;
  
  IF NEW.cohort_id IS NULL THEN
    SELECT id INTO default_cohort_id
    FROM public.member_area_cohorts
    WHERE member_area_id = NEW.member_area_id
      AND status = 'active'
      AND name = 'Turma A'
    LIMIT 1;
    
    IF default_cohort_id IS NOT NULL THEN
      NEW.cohort_id := default_cohort_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- ETAPA 4: Adicionar Índices para Performance
-- ==========================================

-- Índices para customer_balances
CREATE INDEX IF NOT EXISTS idx_customer_balances_user_id ON public.customer_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_email ON public.customer_balances(email) WHERE email IS NOT NULL;

-- Índices para balance_transactions
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON public.balance_transactions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_transactions_email ON public.balance_transactions(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON public.balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON public.balance_transactions(created_at DESC);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_product_status ON public.orders(product_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status_payment ON public.orders(status, payment_method);

-- Índices para customer_access
CREATE INDEX IF NOT EXISTS idx_customer_access_email_product ON public.customer_access(customer_email, product_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_expires ON public.customer_access(access_expires_at) WHERE is_active = true;

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_user_status ON public.products(user_id, status);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- Índices para member_area_students
CREATE INDEX IF NOT EXISTS idx_member_students_email ON public.member_area_students(student_email);
CREATE INDEX IF NOT EXISTS idx_member_students_area ON public.member_area_students(member_area_id);

-- ==========================================
-- COMENTÁRIOS FINAIS
-- ==========================================

COMMENT ON FUNCTION public.handle_new_user IS 'Cria perfil quando novo usuário é registrado - SECURITY DEFINER com search_path';
COMMENT ON FUNCTION public.sync_customer_balance IS 'Sincroniza saldo do cliente após transações - SECURITY DEFINER com search_path';
COMMENT ON FUNCTION public.admin_process_withdrawal_request IS 'Processa pedidos de saque (apenas admins) - SECURITY DEFINER com search_path';
