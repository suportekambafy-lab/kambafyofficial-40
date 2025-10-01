-- Adicionar coluna para controlar comentários nas áreas de membros
ALTER TABLE member_areas 
ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN NOT NULL DEFAULT true;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_member_areas_comments_enabled 
ON member_areas(comments_enabled);