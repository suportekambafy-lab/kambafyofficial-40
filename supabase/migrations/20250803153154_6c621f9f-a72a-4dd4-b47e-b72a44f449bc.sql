-- Criar bucket para capas de produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-covers', 'product-covers', true);

-- Criar políticas para o bucket de capas
CREATE POLICY "Anyone can view product covers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-covers');

CREATE POLICY "Users can upload product covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own product covers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own product covers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-covers' AND auth.uid() IS NOT NULL);