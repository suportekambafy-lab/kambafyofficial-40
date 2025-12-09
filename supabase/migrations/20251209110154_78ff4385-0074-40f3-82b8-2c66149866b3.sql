-- Criar função RPC para adicionar estudante à área de membros (usada pelo admin)
CREATE OR REPLACE FUNCTION public.admin_add_student_to_member_area(
  p_member_area_id UUID,
  p_student_email TEXT,
  p_student_name TEXT,
  p_cohort_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_existing_id UUID;
BEGIN
  -- Verificar se o estudante já existe
  SELECT id INTO v_existing_id
  FROM member_area_students
  WHERE member_area_id = p_member_area_id 
    AND LOWER(student_email) = LOWER(p_student_email);
  
  IF v_existing_id IS NOT NULL THEN
    -- Estudante já existe, retornar sucesso
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Student already exists',
      'student_id', v_existing_id
    );
  END IF;
  
  -- Inserir novo estudante
  INSERT INTO member_area_students (
    member_area_id,
    student_email,
    student_name,
    cohort_id,
    access_granted_at
  ) VALUES (
    p_member_area_id,
    p_student_email,
    p_student_name,
    p_cohort_id,
    NOW()
  )
  RETURNING id INTO v_existing_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Student added successfully',
    'student_id', v_existing_id
  );
  
EXCEPTION WHEN unique_violation THEN
  -- Tratar caso de duplicação
  SELECT id INTO v_existing_id
  FROM member_area_students
  WHERE member_area_id = p_member_area_id 
    AND LOWER(student_email) = LOWER(p_student_email);
    
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Student already exists (concurrent insert)',
    'student_id', v_existing_id
  );
END;
$$;

-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION public.admin_add_student_to_member_area TO authenticated;