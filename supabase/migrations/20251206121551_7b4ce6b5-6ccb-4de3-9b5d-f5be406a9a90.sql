
-- Adicionar aluna deuryanaguerra4@gmail.com às áreas de membros

-- 1. Milionário com IA (Victor Muabi)
INSERT INTO member_area_students (member_area_id, student_email, student_name, access_granted_at)
VALUES (
  'c13f3dc7-66e7-4b90-8821-9e23767e7561',
  'deuryanaguerra4@gmail.com',
  'Deuryana Guerra',
  NOW()
)
ON CONFLICT (member_area_id, student_email) DO NOTHING;

-- 2. Comunidade Amado Ruben
INSERT INTO member_area_students (member_area_id, student_email, student_name, access_granted_at)
VALUES (
  '30c47b8d-3616-4009-8986-a41aa62a2b53',
  'deuryanaguerra4@gmail.com',
  'Deuryana Guerra',
  NOW()
)
ON CONFLICT (member_area_id, student_email) DO NOTHING;
