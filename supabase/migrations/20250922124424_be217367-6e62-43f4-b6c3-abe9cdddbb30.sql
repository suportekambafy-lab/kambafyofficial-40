-- Atualizar produtos com métodos de pagamento incorretos
-- Corrigir produtos que têm reference e transfer com a mesma imagem

UPDATE public.products 
SET payment_methods = '[
  {"id": "express", "name": "Multicaixa Express", "image": "/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png", "enabled": true},
  {"id": "reference", "name": "Pagamento por referência", "image": "/lovable-uploads/d8b7629c-9a63-44ac-a6a8-dbb0d773d76b.png", "enabled": true},
  {"id": "transfer", "name": "Transferência Bancária", "image": "/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png", "enabled": true}
]'::jsonb
WHERE payment_methods IS NULL 
   OR payment_methods = '[]'::jsonb
   OR (
     payment_methods::text LIKE '%"id":"reference"%' 
     AND payment_methods::text LIKE '%"image":"/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png"%'
   );