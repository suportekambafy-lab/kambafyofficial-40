-- Remover registos AOA (devem ser normalizados para KZ)
DELETE FROM public.currency_balances WHERE currency = 'AOA';