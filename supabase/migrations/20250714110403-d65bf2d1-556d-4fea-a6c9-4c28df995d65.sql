-- Criar política para permitir leitura pública de pixels ativos no checkout
CREATE POLICY "Public can view active pixels for checkout" 
ON public.facebook_pixel_settings 
FOR SELECT 
USING (enabled = true);