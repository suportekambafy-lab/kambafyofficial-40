-- Remover índice problemático que impede múltiplas transações por ordem
-- O índice idx_balance_transactions_order_user_unique só permite 1 transação por (order_id, user_id)
-- Mas precisamos de 2: platform_fee + sale_revenue

DROP INDEX IF EXISTS public.idx_balance_transactions_order_user_unique;

-- O índice unique_transaction_per_order já garante unicidade correta:
-- (user_id, order_id, type) - permite platform_fee E sale_revenue para mesma ordem