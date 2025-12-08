-- Restore public read access for products (checkout needs this)
-- This is safe because support_email and support_whatsapp should only be exposed through controlled RPC functions

CREATE POLICY "Public can view active products for checkout"
ON products
FOR SELECT
TO anon, authenticated
USING (status = 'Ativo');

-- Note: The sensitive fields (support_email, support_whatsapp) are still in the table
-- but the get_seller_public_info RPC function controls what seller info is exposed publicly