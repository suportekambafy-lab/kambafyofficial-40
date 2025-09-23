-- Deletar todos os produtos exceto os do usuário victormuabi20@gmail.com
DELETE FROM products 
WHERE user_id NOT IN (
  SELECT user_id FROM profiles WHERE email = 'victormuabi20@gmail.com'
);

-- Deletar todos os profiles exceto victormuabi20@gmail.com
DELETE FROM profiles WHERE email != 'victormuabi20@gmail.com';