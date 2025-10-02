-- Criar acesso ao ebook order bump para lobbydosinsanos@gmail.com
INSERT INTO public.customer_access (
  customer_email,
  customer_name,
  product_id,
  order_id,
  access_granted_at,
  access_expires_at,
  is_active
)
VALUES (
  'lobbydosinsanos@gmail.com',
  'Lobby dos Insanos',
  '4ff03576-88db-4263-9f41-642d503083fd', -- Lista de 100 produtos vencedores
  'XK4CEEOSM-BUMP',
  '2025-10-02 11:01:22.154616+00',
  NULL,
  true
)
ON CONFLICT (customer_email, product_id) DO NOTHING;