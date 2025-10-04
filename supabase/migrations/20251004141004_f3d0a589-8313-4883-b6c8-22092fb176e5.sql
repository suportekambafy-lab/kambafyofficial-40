-- Criar função que cria automaticamente "Turma A" quando uma área de membros é criada
CREATE OR REPLACE FUNCTION public.create_default_cohort_for_member_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar "Turma A" automaticamente para a nova área de membros
  INSERT INTO public.member_area_cohorts (
    member_area_id,
    user_id,
    name,
    description,
    status,
    current_students
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    'Turma A',
    'Turma padrão - todos os alunos que comprarem pelo link normal serão adicionados aqui automaticamente',
    'active',
    0
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando uma nova área de membros for criada
DROP TRIGGER IF EXISTS create_default_cohort_trigger ON public.member_areas;

CREATE TRIGGER create_default_cohort_trigger
  AFTER INSERT ON public.member_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_cohort_for_member_area();