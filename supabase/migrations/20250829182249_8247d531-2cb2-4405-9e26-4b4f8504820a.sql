-- Create reference_payments table for AppyPay integration
CREATE TABLE public.reference_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZ',
  reference_number TEXT UNIQUE,
  appypay_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  webhook_data JSONB,
  user_id UUID
);

-- Enable RLS
ALTER TABLE public.reference_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reference payments" 
ON public.reference_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = reference_payments.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage reference payments" 
ON public.reference_payments 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_reference_payments_order_id ON public.reference_payments(order_id);
CREATE INDEX idx_reference_payments_reference_number ON public.reference_payments(reference_number);
CREATE INDEX idx_reference_payments_status ON public.reference_payments(status);
CREATE INDEX idx_reference_payments_expires_at ON public.reference_payments(expires_at);

-- Create trigger for updated_at
CREATE TRIGGER update_reference_payments_updated_at
  BEFORE UPDATE ON public.reference_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();