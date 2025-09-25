-- Remover aulas de exemplo da área de membros que foram criadas automaticamente
DELETE FROM public.lessons 
WHERE member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2' 
  AND title IN (
    'Introdução à Marca Milionária', 
    'Estratégias de Posicionamento', 
    'Criando Conexão com a Audiência', 
    'Monetização e Escalabilidade'
  )
  AND created_at = '2025-09-25 10:42:17.614608+00:00';