-- Verificar se o bucket product-covers existe e criar se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-covers', 'product-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket product-covers
-- Permitir visualização pública das capas
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES 
  ('Public can view product covers', 'product-covers', '(true)', '(true)')
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Permitir que usuários autenticados façam upload de suas capas
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES 
  ('Users can upload product covers', 'product-covers', '(auth.uid() IS NOT NULL)', '(auth.uid() IS NOT NULL)')
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Permitir que usuários atualizem suas próprias capas
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES 
  ('Users can update their product covers', 'product-covers', '(auth.uid() IS NOT NULL)', '(auth.uid() IS NOT NULL)')
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Permitir que usuários deletem suas próprias capas
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES 
  ('Users can delete their product covers', 'product-covers', '(auth.uid() IS NOT NULL)', '(auth.uid() IS NOT NULL)')
ON CONFLICT (name, bucket_id) DO NOTHING;