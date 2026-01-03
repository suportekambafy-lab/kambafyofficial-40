-- Limpar triggers redundantes
-- Mantemos os triggers originais (create_balance_on_completed_sale e trigger_balance_on_order_complete)
-- que já processam vendas correctamente via create_balance_transaction_on_sale

-- Remover o trigger redundante que criámos
DROP TRIGGER IF EXISTS order_complete_sale_revenue_trigger ON orders;

-- Remover a função redundante (já existe create_balance_transaction_on_sale que faz o mesmo)
DROP FUNCTION IF EXISTS credit_seller_on_order_complete();

-- Manter calculate_seller_earning para uso em queries/relatórios
-- (não removemos esta função pois é útil para cálculos analíticos)