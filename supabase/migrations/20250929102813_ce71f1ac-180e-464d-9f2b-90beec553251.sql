-- Primeiro, remover duplicados da tabela customer_access mantendo apenas o mais recente
DELETE FROM public.customer_access 
WHERE id NOT IN (
  SELECT DISTINCT ON (customer_email, product_id) id
  FROM public.customer_access
  ORDER BY customer_email, product_id, created_at DESC
);

-- Adicionar constraint única na tabela customer_access
ALTER TABLE public.customer_access 
ADD CONSTRAINT customer_access_email_product_unique 
UNIQUE (customer_email, product_id);

-- Criar função para adicionar produto em "minhas compras" quando estudante é adicionado à área de membros
CREATE OR REPLACE FUNCTION public.add_product_to_customer_purchases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
BEGIN
  -- Buscar o produto associado à área de membros
  SELECT p.* INTO product_record
  FROM public.products p
  WHERE p.member_area_id = NEW.member_area_id
  LIMIT 1;
  
  -- Se encontrar o produto, criar registro de compra
  IF product_record.id IS NOT NULL THEN
    -- Gerar um order_id único para o acesso via área de membros
    order_id_generated := 'member_access_' || NEW.member_area_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    -- Verificar se já existe um registro de compra para este estudante e produto
    IF NOT EXISTS (
      SELECT 1 FROM public.orders 
      WHERE customer_email = NEW.student_email 
      AND product_id = product_record.id
    ) THEN
      -- Inserir na tabela orders para aparecer em "minhas compras"
      INSERT INTO public.orders (
        order_id,
        customer_name,
        customer_email,
        product_id,
        amount,
        currency,
        status,
        payment_method,
        created_at,
        updated_at
      )
      VALUES (
        order_id_generated,
        NEW.student_name,
        NEW.student_email,
        product_record.id,
        product_record.price,
        'KZ',
        'completed',
        'member_access',
        NEW.created_at,
        NOW()
      );
    END IF;
    
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
$$;

-- Criar trigger para executar a função quando um estudante for adicionado à área de membros
DROP TRIGGER IF EXISTS trigger_add_product_to_purchases ON public.member_area_students;

CREATE TRIGGER trigger_add_product_to_purchases
  AFTER INSERT ON public.member_area_students
  FOR EACH ROW
  EXECUTE FUNCTION public.add_product_to_customer_purchases();

-- Executar para estudantes já existentes que não têm registro em orders
INSERT INTO public.orders (
  order_id,
  customer_name,
  customer_email,
  product_id,
  amount,
  currency,
  status,
  payment_method,
  created_at,
  updated_at
)
SELECT 
  'member_access_' || mas.member_area_id || '_' || EXTRACT(EPOCH FROM mas.created_at)::bigint,
  mas.student_name,
  mas.student_email,
  p.id,
  p.price,
  'KZ',
  'completed',
  'member_access',
  mas.created_at,
  NOW()
FROM public.member_area_students mas
JOIN public.products p ON p.member_area_id = mas.member_area_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.customer_email = mas.student_email 
  AND o.product_id = p.id
);