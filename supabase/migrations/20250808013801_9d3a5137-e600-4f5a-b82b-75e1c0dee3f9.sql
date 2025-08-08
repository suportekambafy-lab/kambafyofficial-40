-- Criar bucket para arquivos de áudio
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);

-- Política para permitir leitura pública
CREATE POLICY "Public audio access" ON storage.objects FOR SELECT USING (bucket_id = 'audio');