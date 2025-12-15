-- Deletar TODAS as verificações sem documento de frente (inclui rejeitados)
DELETE FROM identity_verification
WHERE document_front_url IS NULL;

-- Adicionar constraint NOT NULL para document_front_url
ALTER TABLE identity_verification 
ALTER COLUMN document_front_url SET NOT NULL;