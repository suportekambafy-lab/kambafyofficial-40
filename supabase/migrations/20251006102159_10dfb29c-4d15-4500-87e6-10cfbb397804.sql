-- Criar tabela para pagamentos de módulos
CREATE TABLE IF NOT EXISTS public.module_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  cohort_id UUID REFERENCES public.member_area_cohorts(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AOA',
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_proof_url TEXT,
  payment_data JSONB,
  reference_number TEXT,
  entity TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para busca rápida
CREATE INDEX idx_module_payments_module_id ON public.module_payments(module_id);
CREATE INDEX idx_module_payments_student_email ON public.module_payments(student_email);
CREATE INDEX idx_module_payments_order_id ON public.module_payments(order_id);
CREATE INDEX idx_module_payments_status ON public.module_payments(status);
CREATE INDEX idx_module_payments_member_area_id ON public.module_payments(member_area_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_module_payments_updated_at
  BEFORE UPDATE ON public.module_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.module_payments ENABLE ROW LEVEL SECURITY;

-- Vendedores podem ver pagamentos dos seus módulos
CREATE POLICY "Sellers can view their module payments"
  ON public.module_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_payments.module_id
      AND m.user_id = auth.uid()
    )
  );

-- Sistema pode gerenciar todos os pagamentos
CREATE POLICY "System can manage all module payments"
  ON public.module_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Alunos podem ver seus próprios pagamentos
CREATE POLICY "Students can view their own payments"
  ON public.module_payments
  FOR SELECT
  USING (
    student_email = get_current_user_email()
  );

COMMENT ON TABLE public.module_payments IS 'Rastreamento de pagamentos de módulos individuais';