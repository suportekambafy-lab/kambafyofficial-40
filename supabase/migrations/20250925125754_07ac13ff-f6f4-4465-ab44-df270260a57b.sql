-- Adicionar colunas de personalização à tabela member_areas
ALTER TABLE public.member_areas 
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS background_style TEXT DEFAULT 'dark' CHECK (background_style IN ('dark', 'light', 'gradient'));