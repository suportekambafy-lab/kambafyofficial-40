
-- Ativar produto EURUM I.A que estava incorretamente como Pendente
UPDATE public.products
SET 
  status = 'Ativo',
  admin_approved = true,
  revision_requested = false,
  revision_requested_at = NULL,
  updated_at = NOW()
WHERE id = 'e07db0e3-167f-461d-9c2a-53a59f274cc8';
