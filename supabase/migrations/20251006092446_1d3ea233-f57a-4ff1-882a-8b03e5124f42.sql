-- Adicionar campos para controle de "em breve" por turma e módulos pagos
ALTER TABLE public.modules
ADD COLUMN coming_soon_cohort_ids uuid[] DEFAULT NULL,
ADD COLUMN is_paid boolean DEFAULT false,
ADD COLUMN paid_price text DEFAULT NULL,
ADD COLUMN paid_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL DEFAULT NULL;

COMMENT ON COLUMN public.modules.coming_soon_cohort_ids IS 'IDs das turmas onde o módulo aparece como "em breve". NULL = todas as turmas';
COMMENT ON COLUMN public.modules.is_paid IS 'Indica se o módulo requer pagamento adicional';
COMMENT ON COLUMN public.modules.paid_price IS 'Preço do módulo pago (formato texto, ex: "5000 KZ")';
COMMENT ON COLUMN public.modules.paid_product_id IS 'ID do produto associado ao pagamento do módulo';