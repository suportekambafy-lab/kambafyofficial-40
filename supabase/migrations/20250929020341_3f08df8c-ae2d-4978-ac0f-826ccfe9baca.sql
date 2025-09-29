-- Adicionar campos para botão personalizado na área de membros
ALTER TABLE public.member_areas 
ADD COLUMN custom_button_enabled boolean DEFAULT false,
ADD COLUMN custom_button_text text,
ADD COLUMN custom_button_url text;