-- ============================================
-- CORREÇÃO PARTE 2: Funções Restantes
-- ============================================

-- 23. create_auth_user_for_admin
CREATE OR REPLACE FUNCTION public.create_auth_user_for_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO auth.users (
    email,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    encrypted_password
  ) VALUES (
    NEW.email,
    NOW(),
    jsonb_build_object(
      'full_name', NEW.full_name,
      'is_admin', true
    ),
    'authenticated',
    'authenticated',
    NEW.password_hash
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar usuário auth para admin %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 24. create_admin_notification
CREATE OR REPLACE FUNCTION public.create_admin_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'withdrawal_requests' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'withdrawal_request',
      'Novo Pedido de Saque',
      'Um vendedor solicitou um saque de ' || NEW.amount || ' KZ',
      NEW.id,
      'withdrawal_request',
      jsonb_build_object('amount', NEW.amount, 'user_id', NEW.user_id)
    );
  END IF;

  IF TG_TABLE_NAME = 'identity_verification' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'identity_verification',
      'Nova Verificação de Identidade',
      'Um vendedor enviou documentos para verificação de identidade',
      NEW.id,
      'identity_verification',
      jsonb_build_object('user_id', NEW.user_id, 'full_name', NEW.full_name)
    );
  END IF;

  IF TG_TABLE_NAME = 'products' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'new_product',
      'Novo Produto Adicionado',
      'Um vendedor adicionou o produto: ' || NEW.name,
      NEW.id,
      'product',
      jsonb_build_object('user_id', NEW.user_id, 'product_name', NEW.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 25. create_partner_notification
CREATE OR REPLACE FUNCTION public.create_partner_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
  VALUES (
    'partner_application',
    'Nova Aplicação de Parceiro',
    'A empresa ' || NEW.company_name || ' solicitou parceria',
    NEW.id,
    'partner',
    jsonb_build_object(
      'company_name', NEW.company_name,
      'contact_email', NEW.contact_email,
      'contact_name', NEW.contact_name
    )
  );
  RETURN NEW;
END;
$$;

-- 26. create_default_cohort_for_member_area
CREATE OR REPLACE FUNCTION public.create_default_cohort_for_member_area()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_area_cohorts (
    member_area_id,
    user_id,
    name,
    description,
    status,
    current_students
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    'Turma A',
    'Turma padrão - todos os alunos que comprarem pelo link normal serão adicionados aqui automaticamente',
    'active',
    0
  );
  
  RETURN NEW;
END;
$$;

-- 27. add_student_to_cohort_on_purchase
CREATE OR REPLACE FUNCTION public.add_student_to_cohort_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cohort_record RECORD;
  default_cohort_id UUID;
  member_area_record RECORD;
  student_exists BOOLEAN;
BEGIN
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  SELECT p.id, p.member_area_id, p.user_id 
  INTO member_area_record
  FROM public.products p
  WHERE p.id = NEW.product_id;
  
  IF member_area_record.member_area_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.cohort_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.member_area_students
      WHERE member_area_id = member_area_record.member_area_id
        AND student_email = LOWER(TRIM(NEW.customer_email))
        AND cohort_id = NEW.cohort_id
    ) INTO student_exists;
    
    SELECT * INTO cohort_record
    FROM public.member_area_cohorts
    WHERE id = NEW.cohort_id;
    
    IF cohort_record.id IS NOT NULL THEN
      INSERT INTO public.member_area_students (
        member_area_id,
        student_email,
        student_name,
        cohort_id,
        access_granted_at
      )
      VALUES (
        cohort_record.member_area_id,
        LOWER(TRIM(NEW.customer_email)),
        NEW.customer_name,
        NEW.cohort_id,
        NOW()
      )
      ON CONFLICT (member_area_id, student_email) 
      DO UPDATE SET
        cohort_id = NEW.cohort_id,
        updated_at = NOW();
      
      IF NOT student_exists THEN
        UPDATE public.member_area_cohorts
        SET current_students = current_students + 1
        WHERE id = NEW.cohort_id;
      END IF;
      
      UPDATE public.member_area_cohorts
      SET status = 'full'
      WHERE id = NEW.cohort_id 
        AND max_students IS NOT NULL 
        AND current_students >= max_students;
    END IF;
  ELSE
    SELECT id INTO default_cohort_id
    FROM public.member_area_cohorts
    WHERE member_area_id = member_area_record.member_area_id
      AND status = 'active'
      AND name = 'Turma A'
    LIMIT 1;
    
    IF default_cohort_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.member_area_students
        WHERE member_area_id = member_area_record.member_area_id
          AND student_email = LOWER(TRIM(NEW.customer_email))
          AND cohort_id = default_cohort_id
      ) INTO student_exists;
      
      INSERT INTO public.member_area_students (
        member_area_id,
        student_email,
        student_name,
        cohort_id,
        access_granted_at
      )
      VALUES (
        member_area_record.member_area_id,
        LOWER(TRIM(NEW.customer_email)),
        NEW.customer_name,
        default_cohort_id,
        NOW()
      )
      ON CONFLICT (member_area_id, student_email) 
      DO UPDATE SET
        cohort_id = default_cohort_id,
        updated_at = NOW();
      
      IF NOT student_exists THEN
        UPDATE public.member_area_cohorts
        SET current_students = current_students + 1
        WHERE id = default_cohort_id;
      END IF;
      
      NEW.cohort_id := default_cohort_id;
    ELSE
      INSERT INTO public.member_area_students (
        member_area_id,
        student_email,
        student_name,
        access_granted_at
      )
      VALUES (
        member_area_record.member_area_id,
        LOWER(TRIM(NEW.customer_email)),
        NEW.customer_name,
        NOW()
      )
      ON CONFLICT (member_area_id, student_email) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 28. prevent_auto_complete_reference_transfers
CREATE OR REPLACE FUNCTION public.prevent_auto_complete_reference_transfers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' 
     AND OLD.status = 'pending' 
     AND NEW.status = 'completed'
     AND NEW.payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
     AND current_setting('request.jwt.claims', true)::json->>'email' NOT IN (
       SELECT email FROM admin_users WHERE is_active = true
     ) THEN
    RAISE EXCEPTION 'Vendas com método de pagamento "reference" ou "transfer" só podem ser aprovadas manualmente por administradores';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 29. update_product_sales
CREATE OR REPLACE FUNCTION public.update_product_sales()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products 
    SET sales = (
      SELECT COUNT(*)
      FROM orders 
      WHERE orders.product_id = NEW.product_id 
      AND orders.status = 'completed'
    )
    WHERE id = NEW.product_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE products 
    SET sales = (
      SELECT COUNT(*)
      FROM orders 
      WHERE orders.product_id = OLD.product_id 
      AND orders.status = 'completed'
    )
    WHERE id = OLD.product_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 30. update_recovery_analytics
CREATE OR REPLACE FUNCTION public.update_recovery_analytics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.sales_recovery_analytics (
      user_id, 
      product_id, 
      date,
      total_recovered,
      total_recovered_amount,
      recovery_rate
    )
    SELECT 
      p.user_id,
      NEW.product_id,
      CURRENT_DATE,
      CASE WHEN NEW.status = 'recovered' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'recovered' THEN NEW.amount ELSE 0 END,
      (SELECT 
        CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE status = 'recovered'))::NUMERIC / COUNT(*)::NUMERIC * 100
        ELSE 0 END
       FROM abandoned_purchases ap2 
       WHERE ap2.product_id = NEW.product_id
       AND date_trunc('day', ap2.created_at) = CURRENT_DATE
      )
    FROM products p
    WHERE p.id = NEW.product_id
    ON CONFLICT (user_id, product_id, date) 
    DO UPDATE SET
      total_recovered = sales_recovery_analytics.total_recovered + EXCLUDED.total_recovered,
      total_recovered_amount = sales_recovery_analytics.total_recovered_amount + EXCLUDED.total_recovered_amount,
      recovery_rate = EXCLUDED.recovery_rate,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 31. fix_bunny_cdn_urls
CREATE OR REPLACE FUNCTION public.fix_bunny_cdn_urls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products 
  SET share_link = 'https://' || share_link 
  WHERE share_link IS NOT NULL
    AND share_link != ''
    AND NOT share_link LIKE 'http%'
    AND (
      share_link LIKE '%.b-cdn.net%' 
      OR share_link LIKE 'bunnycdn.net%'
      OR share_link LIKE 'kambafy.b-cdn.net%'
    );
    
  RAISE NOTICE 'URLs do Bunny CDN corrigidas com sucesso';
END;
$$;

-- 32. remove_duplicate_withdrawals
CREATE OR REPLACE FUNCTION public.remove_duplicate_withdrawals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  WITH duplicates AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, amount, status 
        ORDER BY created_at DESC
      ) as rn
    FROM public.withdrawal_requests
    WHERE status = 'pendente'
  )
  DELETE FROM public.withdrawal_requests
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 33. check_max_order_bumps
CREATE OR REPLACE FUNCTION public.check_max_order_bumps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SET search_path = public;
  
  IF NEW.enabled = true AND (
    SELECT COUNT(*) FROM public.order_bump_settings 
    WHERE product_id = NEW.product_id 
    AND enabled = true 
    AND (NEW.id IS NULL OR id != NEW.id)
  ) >= 3 THEN
    RAISE EXCEPTION 'Máximo de 3 order bumps ativos permitidos por produto';
  END IF;
  
  IF NEW.bump_order IS NULL THEN
    NEW.bump_order := COALESCE(
      (SELECT MAX(bump_order) + 1 FROM public.order_bump_settings 
       WHERE product_id = NEW.product_id), 
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 34. prevent_test_data_ids
CREATE OR REPLACE FUNCTION public.prevent_test_data_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.id::text ~ '^[a]{8}-[a]{4}-[a]{4}-[a]{4}-[a]{12}$' 
       OR NEW.id::text ~ '^[0]{8}-[0]{4}-[0]{4}-[0]{4}-[0]{12}$' THEN
      RAISE EXCEPTION 'ID de produto inválido: padrão de teste detectado (%))', NEW.id;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.order_id ~ '^(LEO_|TEST_|FAKE_|DEBUG_)' THEN
      RAISE EXCEPTION 'Order ID inválido: prefixo de teste detectado (%)', NEW.order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 35. create_admin_user
CREATE OR REPLACE FUNCTION public.create_admin_user(p_email text, p_password text, p_full_name text, p_role admin_role DEFAULT 'admin', p_permissions text[] DEFAULT ARRAY[]::text[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_admin_id UUID;
  permission TEXT;
  current_admin_email TEXT;
BEGIN
  current_admin_email := get_current_user_email();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = current_admin_email 
    AND is_active = true 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Admin with this email already exists';
  END IF;

  INSERT INTO public.admin_users (email, password_hash, full_name, role, is_active)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_role,
    true
  )
  RETURNING id INTO new_admin_id;

  FOREACH permission IN ARRAY p_permissions
  LOOP
    INSERT INTO public.admin_permissions (admin_id, permission)
    VALUES (new_admin_id, permission);
  END LOOP;

  RETURN new_admin_id;
END;
$$;

-- 36. products_generate_seo
CREATE OR REPLACE FUNCTION public.products_generate_seo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  keywords TEXT[] := ARRAY[]::TEXT[];
  stopwords TEXT[] := ARRAY['de','da','do','para','com','em','um','uma','e','o','a','os','as','dos','das','no','na','por','sobre','depois','antes','entre','sem','ao','à','às','aos','que'];
  t TEXT;
  tokens TEXT[];
  desc_text TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (COALESCE(NEW.name,'') IS DISTINCT FROM COALESCE(OLD.name,''))) THEN
    base_slug := regexp_replace(lower(unaccent(COALESCE(NEW.name, ''))), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := substr(replace(gen_random_uuid()::text,'-',''),1,8);
    END IF;

    candidate := base_slug;
    IF TG_OP = 'INSERT' THEN
      WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = candidate) LOOP
        candidate := base_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,4);
      END LOOP;
    ELSE
      WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = candidate AND id <> NEW.id) LOOP
        candidate := base_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,4);
      END LOOP;
    END IF;

    NEW.slug := candidate;
  END IF;

  IF NEW.seo_title IS NULL OR NEW.seo_title = '' OR TG_OP = 'INSERT' THEN
    NEW.seo_title := substr(COALESCE(NEW.name, ''), 1, 60);
  END IF;

  IF NEW.seo_description IS NULL OR NEW.seo_description = '' OR TG_OP = 'INSERT' THEN
    desc_text := regexp_replace(COALESCE(NEW.description, ''), '\s+', ' ', 'g');
    IF length(desc_text) < 120 THEN
      desc_text := trim(desc_text || ' Compre agora na Kambafy.');
    END IF;
    NEW.seo_description := substr(desc_text, 1, 160);
  END IF;

  IF NEW.seo_keywords IS NULL OR array_length(NEW.seo_keywords,1) IS NULL OR TG_OP = 'INSERT' THEN
    keywords := ARRAY[]::TEXT[];
    IF NEW.tags IS NOT NULL THEN
      FOR t IN SELECT lower(unaccent(x)) FROM unnest(NEW.tags) AS x LOOP
        IF array_position(keywords, t) IS NULL AND char_length(t) >= 3 AND array_position(stopwords, t) IS NULL THEN
          keywords := keywords || t;
          EXIT WHEN array_length(keywords,1) >= 5;
        END IF;
      END LOOP;
    END IF;

    IF (array_length(keywords,1) IS NULL OR array_length(keywords,1) < 5) AND NEW.category IS NOT NULL THEN
      t := lower(unaccent(NEW.category));
      IF array_position(keywords, t) IS NULL AND char_length(t) >= 3 AND array_position(stopwords, t) IS NULL THEN
        keywords := keywords || t;
      END IF;
    END IF;

    IF array_length(keywords,1) IS NULL OR array_length(keywords,1) < 5 THEN
      tokens := regexp_split_to_array(lower(unaccent(COALESCE(NEW.name,''))), '[^a-z0-9]+');
      FOREACH t IN ARRAY tokens LOOP
        IF array_position(keywords, t) IS NULL AND char_length(t) >= 3 AND array_position(stopwords, t) IS NULL THEN
          keywords := keywords || t;
          EXIT WHEN array_length(keywords,1) >= 5;
        END IF;
      END LOOP;
    END IF;

    NEW.seo_keywords := keywords;
  END IF;

  IF NEW.image_alt IS NULL OR NEW.image_alt = '' OR TG_OP = 'INSERT' THEN
    NEW.image_alt := COALESCE(NEW.name, 'Imagem do produto');
  END IF;

  RETURN NEW;
END;
$$;