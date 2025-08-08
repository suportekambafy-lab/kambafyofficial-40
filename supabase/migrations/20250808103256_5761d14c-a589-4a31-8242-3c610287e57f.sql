-- Enable useful extension for slugging
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add SEO columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Ensure slug uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON public.products (slug);

-- Trigger function to generate SEO fields
CREATE OR REPLACE FUNCTION public.products_generate_seo()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  keywords TEXT[] := ARRAY[]::TEXT[];
  stopwords TEXT[] := ARRAY['de','da','do','para','com','em','um','uma','e','o','a','os','as','dos','das','no','na','por','sobre','depois','antes','entre','sem','ao','à','às','aos','que'];
  t TEXT;
  tokens TEXT[];
  desc_text TEXT;
BEGIN
  -- Generate/refresh slug when missing or name changed
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

  -- SEO title (<= 60 chars) from product name
  IF NEW.seo_title IS NULL OR NEW.seo_title = '' OR TG_OP = 'INSERT' THEN
    NEW.seo_title := substr(COALESCE(NEW.name, ''), 1, 60);
  END IF;

  -- SEO description (120-160 chars)
  IF NEW.seo_description IS NULL OR NEW.seo_description = '' OR TG_OP = 'INSERT' THEN
    desc_text := regexp_replace(COALESCE(NEW.description, ''), '\s+', ' ', 'g');
    IF length(desc_text) < 120 THEN
      desc_text := trim(desc_text || ' Compre agora na Kambafy.');
    END IF;
    NEW.seo_description := substr(desc_text, 1, 160);
  END IF;

  -- SEO keywords (up to 5)
  IF NEW.seo_keywords IS NULL OR array_length(NEW.seo_keywords,1) IS NULL OR TG_OP = 'INSERT' THEN
    keywords := ARRAY[]::TEXT[];
    -- From tags first
    IF NEW.tags IS NOT NULL THEN
      FOR t IN SELECT lower(unaccent(x)) FROM unnest(NEW.tags) AS x LOOP
        IF array_position(keywords, t) IS NULL AND char_length(t) >= 3 AND array_position(stopwords, t) IS NULL THEN
          keywords := keywords || t;
          EXIT WHEN array_length(keywords,1) >= 5;
        END IF;
      END LOOP;
    END IF;

    -- From category
    IF (array_length(keywords,1) IS NULL OR array_length(keywords,1) < 5) AND NEW.category IS NOT NULL THEN
      t := lower(unaccent(NEW.category));
      IF array_position(keywords, t) IS NULL AND char_length(t) >= 3 AND array_position(stopwords, t) IS NULL THEN
        keywords := keywords || t;
      END IF;
    END IF;

    -- From product name tokens
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

  -- Image ALT
  IF NEW.image_alt IS NULL OR NEW.image_alt = '' OR TG_OP = 'INSERT' THEN
    NEW.image_alt := COALESCE(NEW.name, 'Imagem do produto');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_products_generate_seo ON public.products;
CREATE TRIGGER trg_products_generate_seo
BEFORE INSERT OR UPDATE OF name, description, category, tags ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_generate_seo();

-- Backfill existing rows
UPDATE public.products
SET name = name
WHERE slug IS NULL OR seo_title IS NULL OR seo_description IS NULL OR seo_keywords IS NULL OR image_alt IS NULL;