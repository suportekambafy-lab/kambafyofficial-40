
-- Adicionar política RLS para permitir que vendedores vejam module_payments através de suas member_areas
CREATE POLICY "Sellers can view module payments through member areas"
ON module_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM member_areas ma
    WHERE ma.id = module_payments.member_area_id 
      AND ma.user_id = auth.uid()
  )
);
