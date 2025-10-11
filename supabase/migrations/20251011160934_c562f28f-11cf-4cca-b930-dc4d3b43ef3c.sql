
-- Reativar produtos aprovados que voltaram para status incorreto devido a edições
-- Fazendo UPDATE direto pois são produtos já aprovados pelo admin anteriormente

UPDATE products 
SET 
  status = 'Ativo',
  revision_requested = false,
  revision_requested_at = NULL,
  revision_explanation = NULL,
  updated_at = now()
WHERE id IN (
  '50bb2aee-4a4d-49b2-86b5-65181e0a5b99',  -- Videos infantil - David Sebastião
  '2a8bc5f9-6be3-4d2e-a959-9f71caee0281'   -- Conteúdo educacional (poemas) - Domingos Augusto
)
AND admin_approved = true;

-- Retornar os produtos atualizados para confirmar
SELECT id, name, status, admin_approved
FROM products
WHERE id IN (
  '50bb2aee-4a4d-49b2-86b5-65181e0a5b99',
  '2a8bc5f9-6be3-4d2e-a959-9f71caee0281'
);
