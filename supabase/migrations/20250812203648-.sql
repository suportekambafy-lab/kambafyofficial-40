-- Add payment_proof_data column to orders table for bank transfer support
ALTER TABLE public.orders 
ADD COLUMN payment_proof_data jsonb;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.orders.payment_proof_data IS 'Store bank transfer proof information including bank, file name, and upload timestamp';