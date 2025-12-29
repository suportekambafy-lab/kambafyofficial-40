-- Adicionar política para permitir que parceiros atualizem seus próprios dados de webhook
CREATE POLICY "Partners can update their own webhook settings"
ON public.partners
FOR UPDATE
USING (api_key = (current_setting('request.headers', true)::json->>'x-api-key'))
WITH CHECK (api_key = (current_setting('request.headers', true)::json->>'x-api-key'));