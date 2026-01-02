-- Corrigir perfil do usuário de teste de Portugal
UPDATE public.profiles 
SET country = 'PT', preferred_currency = 'EUR' 
WHERE email = 'kambafyteste@gmail.com';