-- Habilitar real-time updates para a tabela orders
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Adicionar a tabela orders à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;