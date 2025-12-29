
-- Atualizar email na tabela member_area_students
UPDATE member_area_students 
SET student_email = 'natodeisabelandre@gmail.com', updated_at = NOW()
WHERE LOWER(student_email) = 'www.natodeisabelandre@gmail.com';

-- Atualizar email na tabela customer_access
UPDATE customer_access 
SET customer_email = 'natodeisabelandre@gmail.com', updated_at = NOW()
WHERE LOWER(customer_email) = 'www.natodeisabelandre@gmail.com';
