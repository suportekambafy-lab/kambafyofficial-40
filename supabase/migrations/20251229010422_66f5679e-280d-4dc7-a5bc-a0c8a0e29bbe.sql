-- Remover a política anterior que usa x-api-key (não funciona para o portal)
DROP POLICY IF EXISTS "Partners can update their own webhook settings" ON public.partners;

-- Criar nova política que permite parceiros atualizarem seus dados via email do usuário logado
CREATE POLICY "Partners can update their own settings"
ON public.partners
FOR UPDATE
USING (contact_email = get_current_user_email())
WITH CHECK (contact_email = get_current_user_email());