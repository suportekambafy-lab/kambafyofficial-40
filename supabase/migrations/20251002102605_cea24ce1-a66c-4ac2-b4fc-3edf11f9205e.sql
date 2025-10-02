
-- 1. Eliminar o saque duplicado (o mais recente)
DELETE FROM withdrawal_requests 
WHERE id = '4fbc66c2-cf42-426f-a7da-9d6d9f9bfbf1';

-- 2. Verificar o valor total que deveria ter sido deduzido
-- O saque pendente é de 1639589.04 KZ, mas o valor original antes do desconto seria:
-- 1639589.04 / 0.92 = 1782162.00 KZ (arredondando)

-- 3. Zerar o saldo do usuário (ajustar para 0)
UPDATE customer_balances 
SET balance = 0, updated_at = now()
WHERE email = 'victormuabi20@gmail.com';

-- 4. Criar transação de débito para registrar a dedução que deveria ter acontecido
-- Vamos usar o valor do saque que ficou (48f73c21-9a86-42ce-ab07-a4ac150d343a)
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  created_at
) VALUES (
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  'debit',
  1782162.00,
  'KZ',
  'Correção: Saque solicitado - Valor líquido: 1639589.04 KZ (taxa de 8% deduzida)',
  '2025-10-02 10:21:26'::timestamptz
);

-- 5. Comentário explicativo
COMMENT ON TABLE withdrawal_requests IS 
'Tabela de solicitações de saque. IMPORTANTE: O saldo deve ser deduzido no momento da solicitação do saque, não na aprovação.';
