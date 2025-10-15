-- Zerar apenas o saldo disponível de Leonardo Vilas Boas (mantendo histórico de transações)
UPDATE public.customer_balances
SET 
  balance = 0,
  updated_at = NOW()
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';