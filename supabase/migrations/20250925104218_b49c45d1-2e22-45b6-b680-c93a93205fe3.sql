-- Inserir lições de exemplo para a área "Marca Milionária"
INSERT INTO lessons (
  id,
  title, 
  description,
  member_area_id,
  user_id,
  order_number,
  status,
  duration,
  video_url
) VALUES 
(
  gen_random_uuid(),
  'Introdução à Marca Milionária',
  'Aprenda os fundamentos para construir uma marca de sucesso no mercado digital.',
  '290b0398-c5f4-4681-944b-edc40f6fe0a2',
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  1,
  'published',
  1800,
  'https://example.com/video1'
),
(
  gen_random_uuid(),
  'Estratégias de Posicionamento',
  'Como posicionar sua marca de forma única no mercado e atrair seu público-alvo.',
  '290b0398-c5f4-4681-944b-edc40f6fe0a2',
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  2,
  'published',
  2100,
  'https://example.com/video2'
),
(
  gen_random_uuid(),
  'Criando Conexão com a Audiência',
  'Técnicas avançadas para criar uma conexão emocional duradoura com seus clientes.',
  '290b0398-c5f4-4681-944b-edc40f6fe0a2',
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  3,
  'published',
  1950,
  'https://example.com/video3'
),
(
  gen_random_uuid(),
  'Monetização e Escalabilidade',
  'Como transformar sua marca em um negócio lucrativo e escalável.',
  '290b0398-c5f4-4681-944b-edc40f6fe0a2',
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  4,
  'published',
  2400,
  'https://example.com/video4'
);

-- Inserir módulos organizadores (opcional)
INSERT INTO modules (
  id,
  title,
  description,
  member_area_id,
  user_id,
  order_number,
  status
) VALUES 
(
  gen_random_uuid(),
  'Fundamentos da Marca',
  'Módulo básico com os conceitos essenciais para construir sua marca milionária.',
  '290b0398-c5f4-4681-944b-edc40f6fe0a2',
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  1,
  'published'
),
(
  gen_random_uuid(),
  'Estratégias Avançadas',
  'Técnicas avançadas para acelerar o crescimento da sua marca.',
  '290b0398-c5f4-4681-944b-edc40f6fe0a2',
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  2,
  'published'
);