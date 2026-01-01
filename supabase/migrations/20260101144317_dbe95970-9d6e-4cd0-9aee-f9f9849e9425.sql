-- =============================================
-- ELIMINAR SAQUE FRAUDULENTO DO WALLACE
-- O vendedor se aproveitou do bug de duplicação
-- =============================================

-- 1) Apagar o withdrawal_request suspenso
DELETE FROM withdrawal_requests 
WHERE id = '7f4ea8e4-8b14-41c2-8b54-596a2223fbc6';

-- 2) Manter a transação de débito mas atualizar descrição para documentar
UPDATE balance_transactions 
SET 
  description = 'Débito permanente: saque indevido (exploração de bug de duplicação em 24/12/2025)',
  order_id = 'fraud_removed_withdrawal_7f4ea8e4-8b14-41c2-8b54-596a2223fbc6'
WHERE id = 'b59996f4-1336-485d-946d-5f114bee8b29';