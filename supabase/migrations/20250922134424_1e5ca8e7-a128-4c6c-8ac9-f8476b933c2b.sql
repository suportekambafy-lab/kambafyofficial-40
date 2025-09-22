-- Fix Database Function Security - Phase 2: Function Search Path Issues (Safe Approach)
-- This migration addresses the WARNING level security findings for function search paths
-- Using ALTER instead of DROP to avoid trigger dependency issues

-- Fix create_admin_notification function (keeping existing triggers)
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

-- Fix extend_customer_access function
CREATE OR REPLACE FUNCTION public.extend_customer_access(p_customer_email text, p_product_id uuid, p_order_id text, p_extension_type text, p_extension_value integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  access_record RECORD;
  new_expiration TIMESTAMP WITH TIME ZONE;
  access_id UUID;
BEGIN
  -- Buscar registro de acesso existente
  SELECT * INTO access_record
  FROM public.customer_access
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF access_record IS NOT NULL THEN
    -- Calcular nova data de expiração baseada na atual ou agora
    IF access_record.access_expires_at IS NOT NULL THEN
      new_expiration := public.calculate_access_expiration(
        p_extension_type, 
        p_extension_value, 
        GREATEST(access_record.access_expires_at, now())
      );
    ELSE
      -- Se tinha acesso vitalício, calcular a partir de agora
      new_expiration := public.calculate_access_expiration(
        p_extension_type, 
        p_extension_value, 
        now()
      );
    END IF;
    
    -- Atualizar registro existente
    UPDATE public.customer_access
    SET 
      access_expires_at = new_expiration,
      is_active = true,
      updated_at = now()
    WHERE id = access_record.id;
    
    access_id := access_record.id;
  ELSE
    -- Criar novo registro de acesso
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
      p_customer_email, -- Usar email como nome por padrão
      p_product_id,
      p_order_id,
      new_expiration
    ) RETURNING id INTO access_id;
  END IF;
  
  RETURN access_id;
END;
$function$;