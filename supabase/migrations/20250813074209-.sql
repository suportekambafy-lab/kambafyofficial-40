-- Insert the admin user if it doesn't exist
INSERT INTO public.admin_users (id, email, full_name, password_hash, is_active)
VALUES (
  '4890a23d-ef87-4ba0-9a8d-112c2985200e',
  'suporte@kambafy.com',
  'Administrador Kambafy',
  'dummy_hash', -- Not used since we have custom auth
  true
)
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;