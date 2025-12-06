-- Adicionar campo para armazenar múltiplos métodos de recebimento (withdrawal methods)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS withdrawal_methods jsonb DEFAULT '[]'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN profiles.withdrawal_methods IS 'Array de métodos de recebimento do vendedor: [{type: "angola_bank"|"portugal_iban"|"usdt"|"paypal"|"brazil_pix"|"belgium_iban"|"us_bank", details: {...}}]';