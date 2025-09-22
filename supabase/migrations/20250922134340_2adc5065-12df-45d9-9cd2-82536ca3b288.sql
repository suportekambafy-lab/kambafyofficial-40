-- Fix Database Function Security - Phase 2: Function Search Path Issues
-- This migration addresses the WARNING level security findings for function search paths

-- Fix function search paths by adding SET search_path = public to functions that are missing it
-- This prevents SQL injection through search_path manipulation

-- Fix calculate_commissions function
DROP FUNCTION IF EXISTS public.calculate_commissions(numeric, text, boolean);
CREATE OR REPLACE FUNCTION public.calculate_commissions(order_amount numeric, commission_rate text, has_affiliate boolean)
 RETURNS TABLE(affiliate_commission numeric, seller_commission numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  commission_decimal NUMERIC;
  affiliate_cut NUMERIC;
  seller_cut NUMERIC;
BEGIN
  -- Converter porcentagem para decimal
  commission_decimal := (REPLACE(commission_rate, '%', '')::NUMERIC) / 100;
  
  IF has_affiliate THEN
    -- Se tem afiliado, dividir a comissão
    affiliate_cut := order_amount * commission_decimal;
    seller_cut := order_amount - affiliate_cut;
  ELSE
    -- Se não tem afiliado, vendedor recebe tudo
    affiliate_cut := 0;
    seller_cut := order_amount;
  END IF;
  
  RETURN QUERY SELECT affiliate_cut, seller_cut;
END;
$function$;

-- Fix create_admin_notification function
DROP FUNCTION IF EXISTS public.create_admin_notification();
CREATE OR REPLACE FUNCTION public.create_admin_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Notificação para novos saques
  IF TG_TABLE_NAME = 'withdrawal_requests' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'withdrawal_request',
      'Novo Pedido de Saque',
      'Um vendedor solicitou um saque de ' || NEW.amount || ' KZ',
      NEW.id,
      'withdrawal_request',
      jsonb_build_object('amount', NEW.amount, 'user_id', NEW.user_id)
    );
  END IF;

  -- Notificação para novos pedidos de verificação de identidade
  IF TG_TABLE_NAME = 'identity_verification' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'identity_verification',
      'Nova Verificação de Identidade',
      'Um vendedor enviou documentos para verificação de identidade',
      NEW.id,
      'identity_verification',
      jsonb_build_object('user_id', NEW.user_id, 'full_name', NEW.full_name)
    );
  END IF;

  -- Notificação para novos produtos
  IF TG_TABLE_NAME = 'products' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'new_product',
      'Novo Produto Adicionado',
      'Um vendedor adicionou o produto: ' || NEW.name,
      NEW.id,
      'product',
      jsonb_build_object('user_id', NEW.user_id, 'product_name', NEW.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix create_partner_notification function
DROP FUNCTION IF EXISTS public.create_partner_notification();
CREATE OR REPLACE FUNCTION public.create_partner_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
  VALUES (
    'partner_application',
    'Nova Aplicação de Parceiro',
    'A empresa ' || NEW.company_name || ' solicitou parceria',
    NEW.id,
    'partner',
    jsonb_build_object(
      'company_name', NEW.company_name,
      'contact_email', NEW.contact_email,
      'contact_name', NEW.contact_name
    )
  );
  RETURN NEW;
END;
$function$;

-- Fix calculate_access_expiration function
DROP FUNCTION IF EXISTS public.calculate_access_expiration(text, integer, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.calculate_access_expiration(duration_type text, duration_value integer, base_date timestamp with time zone DEFAULT now())
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF duration_type = 'lifetime' OR duration_type IS NULL THEN
    RETURN NULL; -- Acesso vitalício
  END IF;
  
  CASE duration_type
    WHEN 'days' THEN
      RETURN base_date + (duration_value || ' days')::INTERVAL;
    WHEN 'months' THEN
      RETURN base_date + (duration_value || ' months')::INTERVAL;
    WHEN 'years' THEN
      RETURN base_date + (duration_value || ' years')::INTERVAL;
    ELSE
      RETURN NULL; -- Fallback para acesso vitalício
  END CASE;
END;
$function$;