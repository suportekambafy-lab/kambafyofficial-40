-- Criar tabela para pagamentos por referência AppyPay
CREATE TABLE IF NOT EXISTS public.reference_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  product_id UUID NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZ',
  reference_number TEXT,
  appypay_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.reference_payments ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem pagamentos dos seus produtos
CREATE POLICY "Sellers can view payments for their products"
ON public.reference_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = reference_payments.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Política para criar novos pagamentos (checkout público)
CREATE POLICY "Anyone can create reference payments"
ON public.reference_payments
FOR INSERT
WITH CHECK (true);

-- Política para o sistema atualizar status dos pagamentos
CREATE POLICY "System can update payment status"
ON public.reference_payments
FOR UPDATE
USING (true);

-- Índices para melhor performance
CREATE INDEX idx_reference_payments_order_id ON public.reference_payments(order_id);
CREATE INDEX idx_reference_payments_reference_number ON public.reference_payments(reference_number);
CREATE INDEX idx_reference_payments_status ON public.reference_payments(status);
CREATE INDEX idx_reference_payments_product_id ON public.reference_payments(product_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_reference_payments_updated_at
  BEFORE UPDATE ON public.reference_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();