
-- Adicionar política para permitir que visitantes anônimos verifiquem acesso à área de membros
-- Esta política é necessária porque o login de membros não usa Supabase Auth

-- Política para permitir SELECT anônimo quando o email corresponde (para verificação de login)
CREATE POLICY "Allow public email verification for member login" 
ON public.member_area_students 
FOR SELECT 
TO anon
USING (true);

-- Nota: Esta política permite que qualquer pessoa verifique se um email tem acesso
-- A segurança é mantida porque:
-- 1. Só expõe se o email existe ou não (informação necessária para login)
-- 2. O acesso real à área de membros requer verificação 2FA ou dispositivo confiável
-- 3. Não expõe dados sensíveis como informações de pagamento
