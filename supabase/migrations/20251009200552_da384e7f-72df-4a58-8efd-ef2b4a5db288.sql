
-- Adicionar campos para explicação e documentos de revisão na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS revision_explanation TEXT,
ADD COLUMN IF NOT EXISTS revision_documents JSONB DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN products.revision_explanation IS 'Explicação do vendedor ao solicitar revisão de produto banido';
COMMENT ON COLUMN products.revision_documents IS 'Array de URLs de documentos anexados pelo vendedor ao solicitar revisão';
