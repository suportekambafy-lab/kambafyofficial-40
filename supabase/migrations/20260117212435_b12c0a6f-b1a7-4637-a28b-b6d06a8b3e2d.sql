-- Drop the old constraint and add a new one with all payment methods
ALTER TABLE external_payments DROP CONSTRAINT external_payments_payment_method_check;

ALTER TABLE external_payments ADD CONSTRAINT external_payments_payment_method_check 
CHECK (payment_method = ANY (ARRAY['express'::text, 'reference'::text, 'mbway'::text, 'multibanco'::text, 'card'::text]));