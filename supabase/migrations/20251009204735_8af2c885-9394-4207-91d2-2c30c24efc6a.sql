-- Adicionar 'RG' aos tipos de documento permitidos
ALTER TABLE public.identity_verification 
DROP CONSTRAINT IF EXISTS identity_verification_document_type_check;

ALTER TABLE public.identity_verification
ADD CONSTRAINT identity_verification_document_type_check 
CHECK (document_type IN ('BI', 'RG', 'Passaporte', 'Cartao_Residencia', 'Outro'));