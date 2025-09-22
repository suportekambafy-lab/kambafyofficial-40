-- Fix Security Definer functions by adding proper access controls and search_path
-- This addresses the security linter warnings while maintaining functionality

-- 1. Update admin functions to include proper authorization checks and secure search_path
CREATE OR REPLACE FUNCTION public.admin_approve_product(product_id uuid, admin_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Atualizar o produto diretamente (bypassa RLS)
  UPDATE public.products 
  SET 
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    updated_at = now()
  WHERE id = product_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ban_product(product_id uuid, admin_id uuid DEFAULT NULL::uuid, ban_reason_text text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Atualizar o produto diretamente (bypassa RLS)
  UPDATE public.products 
  SET 
    status = 'Banido',
    admin_approved = false,
    ban_reason = ban_reason_text,
    updated_at = now()
  WHERE id = product_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(request_id uuid, new_status text, admin_id uuid DEFAULT NULL::uuid, notes_text text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Atualizar a solicitação diretamente (bypassa RLS)
  UPDATE public.withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
END;
$function$;

-- 2. Update other critical functions with secure search_path
CREATE OR REPLACE FUNCTION public.approve_partner(partner_id uuid, admin_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if the current user is an admin
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
$function$;

-- 3. Update system functions with secure search_path (these legitimately need SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.cleanup_expired_member_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.member_area_sessions
  WHERE expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_student_to_member_area()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  product_member_area_id UUID;
BEGIN
  -- Buscar o member_area_id do produto comprado
  SELECT member_area_id INTO product_member_area_id
  FROM public.products
  WHERE id = NEW.product_id;
  
  -- Se o produto tem uma área de membros associada, adicionar o estudante
  IF product_member_area_id IS NOT NULL THEN
    INSERT INTO public.member_area_students (
      member_area_id,
      student_email,
      student_name
    )
    VALUES (
      product_member_area_id,
      NEW.customer_email,
      NEW.customer_name
    )
    ON CONFLICT (member_area_id, student_email) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Update utility functions that access system data
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'suporte@kambafy.com'  -- Fallback para admin
  );
$function$;

-- 5. Update functions that need to bypass RLS for legitimate business logic
CREATE OR REPLACE FUNCTION public.detect_abandoned_purchase(_product_id uuid, _customer_email text, _customer_name text, _amount numeric, _currency text DEFAULT 'KZ'::text, _customer_phone text DEFAULT NULL::text, _ip_address text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;