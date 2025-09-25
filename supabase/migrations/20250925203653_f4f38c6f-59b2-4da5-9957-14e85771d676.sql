-- Adicionar campos para links e materiais nas aulas
ALTER TABLE public.lessons 
ADD COLUMN complementary_links jsonb DEFAULT '[]'::jsonb,
ADD COLUMN lesson_materials jsonb DEFAULT '[]'::jsonb;

-- Comentários explicativos
COMMENT ON COLUMN public.lessons.complementary_links IS 'Array de links complementares com título e URL';
COMMENT ON COLUMN public.lessons.lesson_materials IS 'Array de materiais da aula (PDFs, documentos, etc.)';

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_lessons_complementary_links ON public.lessons USING GIN(complementary_links);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_materials ON public.lessons USING GIN(lesson_materials);