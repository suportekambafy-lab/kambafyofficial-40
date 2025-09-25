-- Corrigir os dados da aula na área de membros
UPDATE lessons 
SET 
  duration = 1800, -- 30 minutos em segundos (ajuste conforme necessário)
  order_number = 1  -- Primeira aula da sequência
WHERE id = '5243f950-6a2b-42a1-bdf6-1354aaaf1df3';