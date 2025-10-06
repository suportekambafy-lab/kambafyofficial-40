-- Remover o último saque de victormuabi20@gmail.com
DELETE FROM withdrawal_requests
WHERE id IN (
  SELECT wr.id
  FROM withdrawal_requests wr
  JOIN profiles p ON wr.user_id = p.user_id
  WHERE p.email = 'victormuabi20@gmail.com'
  ORDER BY wr.created_at DESC
  LIMIT 1
);