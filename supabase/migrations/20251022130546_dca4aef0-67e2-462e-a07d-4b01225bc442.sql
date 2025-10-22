-- Criar bucket para anexos de comentários
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-attachments', 'community-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna de anexos na tabela de comentários
ALTER TABLE public.community_comments 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- RLS policies para o bucket
CREATE POLICY "Anyone can view community attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'community-attachments');

CREATE POLICY "Authenticated users can upload community attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'community-attachments');

CREATE POLICY "Users can delete their own community attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'community-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);