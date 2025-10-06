-- Adicionar coluna dedicada para AppyPay transaction IDs
ALTER TABLE orders 
ADD COLUMN appypay_transaction_id TEXT;

-- Criar índice para buscas rápidas do webhook
CREATE INDEX idx_orders_appypay_transaction_id 
ON orders(appypay_transaction_id);

-- Comentário explicativo
COMMENT ON COLUMN orders.appypay_transaction_id IS 
'ID da transação do AppyPay (merchantTransactionId). Usado para rastreamento de pagamentos Express e Reference.';

-- Migrar dados existentes de AppyPay (copiar de stripe_session_id para appypay_transaction_id)
UPDATE orders 
SET appypay_transaction_id = stripe_session_id
WHERE payment_method IN ('express', 'reference')
  AND stripe_session_id IS NOT NULL
  AND stripe_session_id != '';

-- Limpar stripe_session_id de pedidos AppyPay (agora usam appypay_transaction_id)
UPDATE orders 
SET stripe_session_id = NULL
WHERE payment_method IN ('express', 'reference');