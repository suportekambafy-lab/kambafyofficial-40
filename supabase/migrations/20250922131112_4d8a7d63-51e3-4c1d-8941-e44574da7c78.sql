-- Atualizar todos os produtos existentes com a nova imagem do método de pagamento referência
UPDATE public.products 
SET payment_methods = jsonb_set(
  payment_methods,
  '{1,image}', 
  '"/lovable-uploads/multicaixa-reference-logo.png"'
)
WHERE payment_methods->1->>'id' = 'reference'
AND payment_methods->1->>'image' != '/lovable-uploads/multicaixa-reference-logo.png';