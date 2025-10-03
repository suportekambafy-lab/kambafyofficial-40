-- Criar tabela de turmas para áreas de membros
CREATE TABLE public.member_area_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  currency TEXT DEFAULT 'KZ',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  max_students INTEGER,
  current_students INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX idx_cohorts_member_area ON public.member_area_cohorts(member_area_id);
CREATE INDEX idx_cohorts_product ON public.member_area_cohorts(product_id);
CREATE INDEX idx_cohorts_status ON public.member_area_cohorts(status);

-- Adicionar coluna cohort_id na tabela member_area_students
ALTER TABLE public.member_area_students 
ADD COLUMN cohort_id UUID REFERENCES public.member_area_cohorts(id) ON DELETE SET NULL;

CREATE INDEX idx_students_cohort ON public.member_area_students(cohort_id);

-- RLS Policies
ALTER TABLE public.member_area_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cohorts"
ON public.member_area_cohorts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view active cohorts"
ON public.member_area_cohorts
FOR SELECT
USING (status = 'active');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cohorts_updated_at
  BEFORE UPDATE ON public.member_area_cohorts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();