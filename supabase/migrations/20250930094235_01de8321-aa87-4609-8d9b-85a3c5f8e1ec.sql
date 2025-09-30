-- Normalizar comparação de emails para case-insensitive

-- Atualizar função add_student_to_member_area para normalizar emails
CREATE OR REPLACE FUNCTION public.add_student_to_member_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
  normalized_email TEXT;
BEGIN
  -- Só processar quando o status for 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Normalizar email para lowercase
  normalized_email := LOWER(TRIM(NEW.customer_email));
  
  -- Buscar o member_area_id do produto comprado
  SELECT member_area_id INTO product_record
  FROM public.products
  WHERE id = NEW.product_id;
  
  -- Se o produto tem uma área de membros associada, adicionar o estudante
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

-- Atualizar função add_product_to_customer_purchases para normalizar emails
CREATE OR REPLACE FUNCTION public.add_product_to_customer_purchases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
  normalized_email TEXT;
BEGIN
  -- Normalizar email para lowercase
  normalized_email := LOWER(TRIM(NEW.student_email));
  
  -- Buscar o produto associado à área de membros
  SELECT p.* INTO product_record
  FROM public.products p
  WHERE p.member_area_id = NEW.member_area_id
  LIMIT 1;
  
  -- Se encontrar o produto, criar registro de acesso
  IF product_record.id IS NOT NULL THEN
    -- Gerar um order_id único para o acesso via área de membros
    order_id_generated := 'member_access_' || NEW.member_area_id || '_' || normalized_email || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    -- Inserir na tabela customer_access para controle de acesso
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
      NULL::timestamp with time zone, -- Acesso vitalício via área de membros
      true
    )
    ON CONFLICT (customer_email, product_id) DO UPDATE SET
      is_active = true,
      access_granted_at = GREATEST(customer_access.access_granted_at, NEW.access_granted_at),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar índice case-insensitive para student_email
DROP INDEX IF EXISTS idx_member_area_students_email_lower;
CREATE INDEX idx_member_area_students_email_lower ON public.member_area_students (member_area_id, LOWER(student_email));

-- Criar índice case-insensitive para customer_email em orders
DROP INDEX IF EXISTS idx_orders_customer_email_lower;
CREATE INDEX idx_orders_customer_email_lower ON public.orders (LOWER(customer_email));

-- Criar índice case-insensitive para customer_email em customer_access
DROP INDEX IF EXISTS idx_customer_access_email_lower;
CREATE INDEX idx_customer_access_email_lower ON public.customer_access (LOWER(customer_email));

-- Criar índice case-insensitive para session emails
DROP INDEX IF EXISTS idx_member_area_sessions_email_lower;
CREATE INDEX idx_member_area_sessions_email_lower ON public.member_area_sessions (member_area_id, LOWER(student_email));

COMMENT ON INDEX idx_member_area_students_email_lower IS 'Case-insensitive index for student email lookups';
COMMENT ON INDEX idx_orders_customer_email_lower IS 'Case-insensitive index for customer email lookups in orders';
COMMENT ON INDEX idx_customer_access_email_lower IS 'Case-insensitive index for customer email lookups';
COMMENT ON INDEX idx_member_area_sessions_email_lower IS 'Case-insensitive index for session email lookups';