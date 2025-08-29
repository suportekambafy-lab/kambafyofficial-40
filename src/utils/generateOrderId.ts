/**
 * Gera um ID único para pedidos
 * Formato: ORD-YYYYMMDD-XXXXXX (onde X são caracteres aleatórios)
 */
export const generateOrderId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Gerar 6 caracteres aleatórios
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `ORD-${year}${month}${day}-${randomChars}`;
};

/**
 * Valida se um ID de pedido tem formato válido
 */
export const validateOrderId = (orderId: string): boolean => {
  const regex = /^ORD-\d{8}-[A-Z0-9]{6}$/;
  return regex.test(orderId);
};