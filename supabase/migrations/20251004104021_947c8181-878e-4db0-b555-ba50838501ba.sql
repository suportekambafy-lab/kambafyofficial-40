
-- Migração para adicionar spotsCounter a todos os registros de checkout_customizations que não o têm

DO $$
DECLARE
    record_row RECORD;
    current_settings JSONB;
    new_settings JSONB;
    default_spots_counter JSONB := '{
        "enabled": false,
        "mode": "automatic",
        "initialCount": 100,
        "currentCount": 100,
        "title": "VAGAS RESTANTES",
        "backgroundColor": "#6366f1",
        "textColor": "#ffffff",
        "decrementInterval": 60
    }'::JSONB;
BEGIN
    -- Iterar por todos os registros de checkout_customizations
    FOR record_row IN 
        SELECT id, settings 
        FROM checkout_customizations
    LOOP
        current_settings := record_row.settings;
        
        -- Verificar se spotsCounter existe no settings
        IF current_settings->>'spotsCounter' IS NULL THEN
            -- Adicionar spotsCounter ao settings existente
            new_settings := current_settings || jsonb_build_object('spotsCounter', default_spots_counter);
            
            -- Atualizar o registro
            UPDATE checkout_customizations
            SET settings = new_settings,
                updated_at = now()
            WHERE id = record_row.id;
            
            RAISE NOTICE 'Adicionado spotsCounter ao registro %', record_row.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migração concluída com sucesso!';
END $$;

-- Verificar quantos registros foram atualizados
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN settings->>'spotsCounter' IS NOT NULL THEN 1 END) as records_with_spots_counter
FROM checkout_customizations;
