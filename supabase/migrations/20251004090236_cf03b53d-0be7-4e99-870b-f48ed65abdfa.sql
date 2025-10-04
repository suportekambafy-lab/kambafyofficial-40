-- Remover duplicados mantendo o registro mais recente
DELETE FROM public.member_area_students a
USING public.member_area_students b
WHERE a.id < b.id
  AND a.member_area_id = b.member_area_id
  AND LOWER(TRIM(a.student_email)) = LOWER(TRIM(b.student_email));

-- Normalizar emails para lowercase
UPDATE public.member_area_students
SET student_email = LOWER(TRIM(student_email))
WHERE student_email != LOWER(TRIM(student_email));

-- Criar índice case-insensitive para melhor performance
CREATE INDEX IF NOT EXISTS idx_member_area_students_email_lower 
ON public.member_area_students (member_area_id, LOWER(student_email));