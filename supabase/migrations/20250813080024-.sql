-- Criar bucket para comprovativos de transferência se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Criar políticas RLS para o bucket de comprovativos
CREATE POLICY "Users can upload their payment proofs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Admins can view all payment proofs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Users can view their own payment proofs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-proofs');