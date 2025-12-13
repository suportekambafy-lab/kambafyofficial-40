UPDATE seller_chat_credits 
SET token_balance = token_balance + 50000,
    total_tokens_purchased = total_tokens_purchased + 50000,
    updated_at = now()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';

INSERT INTO chat_token_transactions (user_id, type, tokens, balance_after, description)
VALUES ('a349acdf-584c-441e-adf8-d4bbfe217254', 'bonus', 50000, 50000, 'Créditos adicionados manualmente pelo admin');