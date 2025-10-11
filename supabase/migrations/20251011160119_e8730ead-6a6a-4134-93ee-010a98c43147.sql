
-- Atualizar produtos do Amado Ruben de volta para Ativo
-- usando a função admin para garantir que as políticas RLS sejam respeitadas
SELECT admin_approve_product(
  'fcca185c-2171-4037-84eb-217e14f32060'::uuid,
  NULL,
  'amadoruben203@gmail.com'
);

SELECT admin_approve_product(
  'b164d0de-b261-404c-b733-565758ad586b'::uuid,
  NULL,
  'amadoruben203@gmail.com'
);
