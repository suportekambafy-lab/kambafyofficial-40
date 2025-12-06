-- Atualizar constraint para aceitar os tipos corretos de reembolso
ALTER TABLE balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_type_check;

ALTER TABLE balance_transactions ADD CONSTRAINT balance_transactions_type_check 
CHECK (type = ANY (ARRAY[
  'credit'::text, 
  'debit'::text, 
  'sale_revenue'::text, 
  'affiliate_commission'::text, 
  'kambafy_fee'::text, 
  'platform_fee'::text, 
  'withdrawal'::text, 
  'refund'::text,
  'refund_debit'::text,
  'refund_credit'::text
]));