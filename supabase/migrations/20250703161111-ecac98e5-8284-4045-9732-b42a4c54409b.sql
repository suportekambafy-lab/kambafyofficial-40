
-- Criar tabela para gerenciar estudantes das áreas de membros
CREATE TABLE public.member_area_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  access_granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_area_id, student_email)
);

-- Habilitar RLS
ALTER TABLE public.member_area_students ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para member_area_students
CREATE POLICY "Area owners can manage their students" 
ON public.member_area_students 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.member_areas 
    WHERE id = member_area_students.member_area_id 
    AND user_id = auth.uid()
  )
);

-- Função para adicionar estudante à área de membros automaticamente após compra
CREATE OR REPLACE FUNCTION public.add_student_to_member_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Trigger para executar a função quando uma ordem é criada
CREATE TRIGGER add_student_after_purchase
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.add_student_to_member_area();
