-- =====================================================
-- FIX: Atualizar constraint de document_type para incluir todos os tipos
-- O problema é que a constraint não permite todos os tipos de documentos do código
-- =====================================================

-- Remover constraint antiga
ALTER TABLE identity_verification DROP CONSTRAINT identity_verification_document_type_check;

-- Adicionar nova constraint com todos os tipos de documentos
ALTER TABLE identity_verification ADD CONSTRAINT identity_verification_document_type_check 
CHECK (document_type = ANY (ARRAY[
  'BI'::text,
  'RG'::text, 
  'Passaporte'::text, 
  'Cartao_Residencia'::text, 
  'Outro'::text,
  'CC'::text,
  'CNH'::text,
  'Titulo_Residencia'::text,
  'DIRE'::text,
  'Carta_Conducao'::text,
  'RNE'::text
]));