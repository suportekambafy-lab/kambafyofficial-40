-- Adicionar colunas para suporte a pagamentos com cartão (white-label Stripe)
ALTER TABLE external_payments 
ADD COLUMN IF NOT EXISTS card_session_id TEXT,
ADD COLUMN IF NOT EXISTS card_payment_intent_id TEXT;