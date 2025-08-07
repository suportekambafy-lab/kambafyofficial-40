
-- Adicionar coluna para métodos de pagamento na tabela products
ALTER TABLE public.products 
ADD COLUMN payment_methods JSONB DEFAULT '[
  {"id": "express", "name": "Multicaixa Express", "image": "/lovable-uploads/e9a7b374-3f3c-4e2b-ad03-9cdefa7be8a8.png", "enabled": true},
  {"id": "reference", "name": "Pagamento por referência", "image": "/lovable-uploads/d8b7629c-9a63-44ac-a6a8-dbb0d773d76b.png", "enabled": true},
  {"id": "transfer", "name": "Transferência Bancária", "image": "/lovable-uploads/809ca111-22ef-4df7-92fc-ebe47ba15021.png", "enabled": true},
  {"id": "apple_pay", "name": "Apple Pay", "image": "/lovable-uploads/d6c21712-0212-4bb9-8cc1-3de35e106b9d.png", "enabled": false}
]'::jsonb;
