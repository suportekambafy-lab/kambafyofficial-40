-- Configurar realtime para a tabela orders
-- Garantir que REPLICA IDENTITY está em FULL para capturar todas as mudanças
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Comentário explicativo
COMMENT ON TABLE public.orders IS 'Tabela de pedidos com realtime habilitado para detectar mudanças de status em tempo real';