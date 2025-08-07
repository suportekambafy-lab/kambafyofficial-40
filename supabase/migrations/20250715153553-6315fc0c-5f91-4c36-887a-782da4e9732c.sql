-- Primeiro, vamos sincronizar os dados existentes
UPDATE products 
SET sales = (
  SELECT COUNT(*)
  FROM orders 
  WHERE orders.product_id = products.id 
  AND orders.status = 'completed'
);

-- Criar função para atualizar vendas
CREATE OR REPLACE FUNCTION update_product_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contagem de vendas quando um pedido é inserido ou atualizado
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
  
  -- Atualizar contagem de vendas quando um pedido é excluído
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
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar vendas automaticamente
CREATE TRIGGER update_product_sales_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_product_sales();