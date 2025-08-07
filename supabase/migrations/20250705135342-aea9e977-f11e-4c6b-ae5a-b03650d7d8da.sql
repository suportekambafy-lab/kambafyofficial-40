
-- Criar tabela de módulos
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_area_id UUID REFERENCES public.member_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS (Row Level Security) para módulos
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para módulos
CREATE POLICY "Users can create their own modules" 
  ON public.modules 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own modules" 
  ON public.modules 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own modules" 
  ON public.modules 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modules" 
  ON public.modules 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Adicionar coluna module_id na tabela lessons
ALTER TABLE public.lessons 
ADD COLUMN module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;

-- Criar trigger para atualizar updated_at nos módulos
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
