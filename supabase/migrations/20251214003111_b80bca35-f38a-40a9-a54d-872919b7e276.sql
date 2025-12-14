-- Drop the existing constraint and add a new one with additional types
ALTER TABLE public.chat_token_transactions 
DROP CONSTRAINT chat_token_transactions_type_check;

ALTER TABLE public.chat_token_transactions 
ADD CONSTRAINT chat_token_transactions_type_check 
CHECK (type = ANY (ARRAY['purchase'::text, 'usage'::text, 'bonus'::text, 'refund'::text, 'pending_purchase'::text, 'failed_purchase'::text]));