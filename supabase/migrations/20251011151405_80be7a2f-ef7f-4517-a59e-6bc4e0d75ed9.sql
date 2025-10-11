-- Criar/atualizar conta no Supabase Auth para o Amado Ruben
-- Verificando primeiro se existe

DO $$
DECLARE
  existing_user_id UUID;
  new_user_id UUID;
BEGIN
  -- Verificar se o usuário já existe
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'amadoruben203@gmail.com';

  IF existing_user_id IS NOT NULL THEN
    -- Usuário existe, apenas atualizar senha
    UPDATE auth.users
    SET 
      encrypted_password = crypt('3344Codfy.', gen_salt('bf')),
      updated_at = NOW(),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = existing_user_id;
    
    RAISE NOTICE 'Senha atualizada para usuário existente: %', existing_user_id;
  ELSE
    -- Usuário não existe, criar novo
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'amadoruben203@gmail.com',
      crypt('3344Codfy.', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Amado Ruben","is_admin":true}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- Criar identidade para o novo usuário
    IF new_user_id IS NOT NULL THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        new_user_id,
        format('{"sub":"%s","email":"%s"}', new_user_id::text, 'amadoruben203@gmail.com')::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Novo usuário criado: %', new_user_id;
    END IF;
  END IF;
END $$;