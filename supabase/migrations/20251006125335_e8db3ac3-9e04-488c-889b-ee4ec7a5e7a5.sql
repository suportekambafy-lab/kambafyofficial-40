-- Criar tabela para controle de acesso individual a módulos
CREATE TABLE public.module_student_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  cohort_id UUID REFERENCES public.member_area_cohorts(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.module_payments(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(module_id, student_email)
);

-- Índices para performance
CREATE INDEX idx_module_student_access_lookup 
ON public.module_student_access(module_id, student_email);

CREATE INDEX idx_module_student_access_student 
ON public.module_student_access(student_email);

-- Ativar RLS
ALTER TABLE public.module_student_access ENABLE ROW LEVEL SECURITY;

-- Policy: Donos da área podem ver acessos dos alunos
CREATE POLICY "Area owners can view student access"
ON public.module_student_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.member_areas ma
    WHERE ma.id = module_student_access.member_area_id
    AND ma.user_id = auth.uid()
  )
);

-- Policy: Sistema pode gerenciar acessos
CREATE POLICY "System can manage student access"
ON public.module_student_access FOR ALL
USING (true)
WITH CHECK (true);