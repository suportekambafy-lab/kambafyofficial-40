-- Adicionar 'platform_fee' aos tipos permitidos em balance_transactions
ALTER TABLE public.balance_transactions 
DROP CONSTRAINT IF EXISTS balance_transactions_type_check;

ALTER TABLE public.balance_transactions 
ADD CONSTRAINT balance_transactions_type_check 
CHECK (type IN (
  'credit',
  'debit', 
  'sale_revenue',
  'affiliate_commission',
  'kambafy_fee',
  'platform_fee',
  'withdrawal',
  'refund'
));