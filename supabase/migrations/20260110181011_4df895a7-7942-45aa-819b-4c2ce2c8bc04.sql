-- Reativar os 6 produtos de Victor Muabi que foram arquivados por engano
-- Esses produtos NÃO estavam nas imagens do usuário

UPDATE products 
SET status = 'Ativo', updated_at = now()
WHERE id IN (
  'c599dc0c-3074-4267-af40-4df38c59d975',  -- Acesso vitalício (10.000 KZ)
  'c9c36a93-8c79-4a74-a1ef-64ab3c4c685b',  -- Acesso vitálicio (9.900 KZ)
  '4ff03576-88db-4263-9f41-642d503083fd',  -- Lista de 100 produtos vencedores
  'fa483e34-7c1b-44cd-9403-1942b53f43ca',  -- Lista secreta (50 ideias de negócios)
  '45a71fee-6d60-4c13-9823-3f1166ca2677',  -- Marca Milionária
  'ea872141-cf2f-4c36-b1f0-2d6ed6789c4b'   -- Milionário com IA
);