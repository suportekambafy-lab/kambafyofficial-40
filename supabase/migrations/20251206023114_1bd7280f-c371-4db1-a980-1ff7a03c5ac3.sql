-- Atualizar email e senha do super admin existente
-- Hash bcrypt para "Kambafy2025@geral"
UPDATE public.admin_users
SET 
  email = 'geral@kambafy.com',
  password_hash = '$2a$10$7CzAZ.CnDPsZDxMKjKx.CuVpxlQhZLqQY8Xj2F3wVtqoNl6.RzKQC',
  full_name = 'Super Admin Kambafy',
  updated_at = now()
WHERE email = 'suporte@kambafy.com' OR role = 'super_admin';