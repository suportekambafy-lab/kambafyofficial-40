-- Atualizar todas as vendas do Victor Muabi para status pago
UPDATE public.orders 
SET 
  status = 'completed',
  updated_at = now()
WHERE customer_name ILIKE '%Victor Muabi%';