-- Primeiro, vamos adicionar manualmente o estudante que já comprou
INSERT INTO public.member_area_students (
  member_area_id,
  student_email,
  student_name,
  access_granted_at,
  created_at
)
VALUES (
  'dc832d54-2a7a-4965-8616-43dd723dc8fa',
  'victormuabi20@gmail.com',
  'victor',
  '2025-09-23 20:12:01.596688+00'::timestamptz,
  now()
)
ON CONFLICT (member_area_id, student_email) DO NOTHING;

-- Agora vamos criar o trigger para automatizar isso no futuro
CREATE OR REPLACE FUNCTION public.add_student_to_member_area()
RETURNS TRIGGER AS $$
DECLARE
  product_member_area_id UUID;
BEGIN
  -- Só processar quando o status for 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o member_area_id do produto comprado
  SELECT member_area_id INTO product_member_area_id
  FROM public.products
  WHERE id = NEW.product_id;
  
  -- Se o produto tem uma área de membros associada, adicionar o estudante
  IF product_member_area_id IS NOT NULL THEN
    INSERT INTO public.member_area_students (
      member_area_id,
      student_email,
      student_name,
      access_granted_at
    )
    VALUES (
      product_member_area_id,
      NEW.customer_email,
      NEW.customer_name,
      NEW.created_at
    )
    ON CONFLICT (member_area_id, student_email) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger se não existir
DROP TRIGGER IF EXISTS trigger_add_student_to_member_area ON public.orders;
CREATE TRIGGER trigger_add_student_to_member_area
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.add_student_to_member_area();

-- Processar todas as compras existentes que ainda não têm acesso
INSERT INTO public.member_area_students (
  member_area_id,
  student_email,
  student_name,
  access_granted_at
)
SELECT DISTINCT
  p.member_area_id,
  o.customer_email,
  o.customer_name,
  o.created_at
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.status = 'completed'
  AND p.member_area_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.member_area_students mas
    WHERE mas.member_area_id = p.member_area_id
      AND mas.student_email = o.customer_email
  )
ON CONFLICT (member_area_id, student_email) DO NOTHING;