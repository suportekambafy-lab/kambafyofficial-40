-- Primeiro remove o trigger que depende da função
DROP TRIGGER IF EXISTS trigger_add_product_to_purchases ON public.member_area_students;

-- Remove a função existente
DROP FUNCTION IF EXISTS public.add_product_to_customer_purchases() CASCADE;

-- Criar nova versão da função que NÃO adiciona na tabela orders
CREATE OR REPLACE FUNCTION public.add_product_to_customer_purchases()
RETURNS trigger
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
  
  -- Se encontrar o produto, criar APENAS registro de acesso (NÃO na tabela orders)
  IF product_record.id IS NOT NULL THEN
    -- Gerar um order_id único para o acesso via área de membros
    order_id_generated := 'member_access_' || NEW.member_area_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    -- APENAS inserir na tabela customer_access para controle de acesso
    -- NÃO mais na tabela orders para evitar vendas falsas no painel do vendedor
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
      NULL, -- Acesso vitalício via área de membros
      true
    )
    ON CONFLICT (customer_email, product_id) DO UPDATE SET
      is_active = true,
      access_granted_at = NEW.access_granted_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger com a função atualizada
CREATE TRIGGER trigger_add_product_to_purchases
  AFTER INSERT ON public.member_area_students
  FOR EACH ROW
  EXECUTE FUNCTION public.add_product_to_customer_purchases();

-- Remover registros existentes de member_access da tabela orders
DELETE FROM public.orders 
WHERE payment_method = 'member_access';