-- Remover policies antigas em withdrawal_requests que referenciam admin_users diretamente
-- Elas são TO public (aplicam a qualquer role) e causam 403/"permission denied for table admin_users" até para vendedores autenticados.

DROP POLICY IF EXISTS "Admin can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update all withdrawal requests" ON public.withdrawal_requests;

-- (Opcional defensivo) se existirem variações antigas com nome parecido, remover também
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;

-- Garantir que as policies corretas existam (não-criaremos novamente aqui se já existem)
-- A policy de SELECT/INSERT para o usuário autenticado já foi criada no último patch.
