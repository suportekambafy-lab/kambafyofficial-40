-- Adicionar campo para orientação das capas dos módulos
ALTER TABLE modules ADD COLUMN cover_orientation text DEFAULT 'horizontal';

-- Comentário: horizontal = aspecto 16:9, vertical = aspecto 9:16 ou 3:4
COMMENT ON COLUMN modules.cover_orientation IS 'Orientação da capa do módulo: horizontal ou vertical';