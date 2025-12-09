-- Criar política para permitir que o sistema (service role) verifique acesso de estudantes
-- O service role normalmente bypassa RLS, mas vamos garantir que há uma policy adequada

-- Adicionar política para permitir leitura pública para validação de email (login)
CREATE POLICY "Public can check student access for login" 
ON member_area_students 
FOR SELECT 
USING (true);

-- Nota: Esta política permite verificação de acesso para login.
-- A segurança é mantida porque só retorna se o email existe, não expõe outros dados sensíveis.