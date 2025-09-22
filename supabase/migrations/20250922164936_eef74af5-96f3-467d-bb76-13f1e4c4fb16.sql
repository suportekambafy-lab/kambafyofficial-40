-- Testar inserção manual para verificar se o trigger está funcionando
-- Primeiro, vamos ver os order bumps existentes
SELECT product_id, bump_order, bump_category, enabled FROM public.order_bump_settings;

-- Tentar inserir um novo order bump manualmente para testar o trigger
INSERT INTO public.order_bump_settings (
    user_id,
    product_id,
    bump_category,
    enabled,
    title,
    description,
    position,
    bump_type
) VALUES (
    'a349acdf-584c-441e-adf8-d4bbfe217254',
    '45a71fee-6d60-4c13-9823-3f1166ca2677',
    'access_extension',
    false,
    'Teste Order Bump 2',
    'Teste de segundo order bump',
    'after_payment_method',
    'access_extension'
);

-- Verificar se foi inserido com bump_order=2
SELECT product_id, bump_order, bump_category, title FROM public.order_bump_settings 
WHERE product_id = '45a71fee-6d60-4c13-9823-3f1166ca2677'
ORDER BY bump_order;