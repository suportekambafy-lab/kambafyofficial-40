-- Habilitar Realtime na tabela profiles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;