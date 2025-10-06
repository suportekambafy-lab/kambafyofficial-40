-- Adicionar constraint de integridade para payment_id
-- Garante que todo acesso tenha um pagamento válido

-- Primeiro, limpar qualquer acesso órfão que possa existir
DELETE FROM module_student_access 
WHERE payment_id IS NOT NULL 
  AND payment_id NOT IN (SELECT id FROM module_payments);

-- Adicionar foreign key constraint
ALTER TABLE module_student_access
ADD CONSTRAINT fk_module_student_access_payment
FOREIGN KEY (payment_id) 
REFERENCES module_payments(id) 
ON DELETE CASCADE;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_module_student_access_payment_id 
ON module_student_access(payment_id);