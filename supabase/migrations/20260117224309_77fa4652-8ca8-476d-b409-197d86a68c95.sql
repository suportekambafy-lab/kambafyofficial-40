-- Remove a constraint atual que limita a taxa de comissão a 10%
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_commission_rate_check;

-- Adiciona nova constraint que permite taxas até 100%
ALTER TABLE partners ADD CONSTRAINT partners_commission_rate_check CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Atualiza Bet Angola: taxa 8% e sem limite mensal (0 = sem limite)
UPDATE partners 
SET commission_rate = 0.08, 
    monthly_transaction_limit = 0 
WHERE id = '73804fe5-ff34-420c-b3d1-fee1f72c074f';