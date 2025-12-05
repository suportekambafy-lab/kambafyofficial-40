-- Update all products to remove apple_pay and add mbway to payment_methods
-- This updates the JSONB array for each active product

-- First, let's create a function to update payment methods
CREATE OR REPLACE FUNCTION update_payment_methods_remove_apple_add_mbway(p_payment_methods JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  method JSONB;
  new_methods JSONB := '[]'::jsonb;
  has_mbway BOOLEAN := false;
BEGIN
  -- Loop through existing methods
  FOR method IN SELECT * FROM jsonb_array_elements(p_payment_methods)
  LOOP
    -- Skip apple_pay
    IF method->>'id' != 'apple_pay' THEN
      new_methods := new_methods || jsonb_build_array(method);
      -- Check if mbway already exists
      IF method->>'id' = 'mbway' THEN
        has_mbway := true;
      END IF;
    END IF;
  END LOOP;
  
  -- Add mbway if it doesn't exist
  IF NOT has_mbway THEN
    new_methods := new_methods || jsonb_build_array(
      jsonb_build_object(
        'id', 'mbway',
        'name', 'MB Way',
        'image', '/assets/mbway-logo.png',
        'enabled', true,
        'isPortugal', true,
        'countryFlag', '🇵🇹',
        'countryName', 'Portugal'
      )
    );
  END IF;
  
  RETURN new_methods;
END;
$$ LANGUAGE plpgsql;

-- Update all products with status 'Ativo' (active)
UPDATE products 
SET payment_methods = update_payment_methods_remove_apple_add_mbway(payment_methods)
WHERE status = 'Ativo' 
  AND payment_methods IS NOT NULL;

-- Also update products that may have other statuses but have payment methods
UPDATE products 
SET payment_methods = update_payment_methods_remove_apple_add_mbway(payment_methods)
WHERE payment_methods IS NOT NULL;

-- Clean up: drop the function after use
DROP FUNCTION IF EXISTS update_payment_methods_remove_apple_add_mbway(JSONB);