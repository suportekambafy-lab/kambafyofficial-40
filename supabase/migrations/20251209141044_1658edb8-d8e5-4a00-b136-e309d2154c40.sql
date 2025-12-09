-- Atualizar apenas registros pendentes sem país para "AO"
UPDATE public.identity_verification 
SET country = 'AO' 
WHERE (country IS NULL OR country = '') 
AND status = 'pendente';