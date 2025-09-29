-- Sincronizar todos os acessos existentes da tabela member_area_students para customer_access
-- Isso garante que todos os usuários com acesso às áreas de membros apareçam em "Meus Acessos"

INSERT INTO public.customer_access (
  customer_email,
  customer_name,
  product_id,
  order_id,
  access_granted_at,
  access_expires_at,
  is_active
)
SELECT DISTINCT
  mas.student_email,
  mas.student_name,
  p.id as product_id,
  'member_access_sync_' || mas.member_area_id || '_' || mas.student_email || '_' || EXTRACT(EPOCH FROM NOW())::bigint as order_id,
  mas.access_granted_at,
  NULL::timestamp with time zone as access_expires_at, -- Acesso vitalício para áreas de membros
  true as is_active
FROM public.member_area_students mas
JOIN public.products p ON p.member_area_id = mas.member_area_id
WHERE p.id IS NOT NULL
  AND NOT EXISTS (
    -- Evitar duplicatas - só inserir se não existir já um acesso para este email+produto
    SELECT 1 FROM public.customer_access ca 
    WHERE ca.customer_email = mas.student_email 
      AND ca.product_id = p.id
  )
ORDER BY mas.access_granted_at;

-- Melhorar a função trigger existente para garantir sincronização futura
CREATE OR REPLACE FUNCTION public.add_product_to_customer_purchases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
BEGIN
  -- Buscar o produto associado à área de membros
  SELECT p.* INTO product_record
  FROM public.products p
  WHERE p.member_area_id = NEW.member_area_id
  LIMIT 1;
  
  -- Se encontrar o produto, criar registro de acesso
  IF product_record.id IS NOT NULL THEN
    -- Gerar um order_id único para o acesso via área de membros
    order_id_generated := 'member_access_' || NEW.member_area_id || '_' || NEW.student_email || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
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
      NEW.student_email,
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
$function$;