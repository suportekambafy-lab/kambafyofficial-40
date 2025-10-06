
-- Deletar os 2 últimos saques do victormuabi
-- ID 1: 48ec91e2-9776-4a03-937d-e2ff9152f3cf (1582501.1632 KZ - pendente)
-- ID 2: f746a51f-b699-4c93-a680-117d7da15094 (92000 KZ - pendente)

DELETE FROM public.withdrawal_requests
WHERE id IN (
  '48ec91e2-9776-4a03-937d-e2ff9152f3cf',
  'f746a51f-b699-4c93-a680-117d7da15094'
);
