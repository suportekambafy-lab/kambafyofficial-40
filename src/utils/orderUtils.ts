// Utility functions for order calculations

/**
 * Counts the total number of items sold in an order
 * This includes the main product + any order bumps
 * @param order - The order object
 * @returns The total count of items (1 for main product + 1 for each order bump)
 */
export const countOrderItems = (order: any): number => {
  let count = 1; // Always count the main product
  
  // Check if there's an order bump
  if (order.order_bump_data) {
    try {
      const bumpData = typeof order.order_bump_data === 'string' 
        ? JSON.parse(order.order_bump_data) 
        : order.order_bump_data;
      
      // If bump data exists and has a product, count it
      if (bumpData && (bumpData.bump_product_name || bumpData.bump_product_id)) {
        count += 1;
      }
    } catch (error) {
      console.error('Error parsing order_bump_data:', error);
    }
  }
  
  return count;
};

/**
 * Counts total sales from an array of orders, including order bumps
 * @param orders - Array of orders
 * @returns Total number of items sold
 */
export const countTotalSales = (orders: any[]): number => {
  return orders.reduce((total, order) => total + countOrderItems(order), 0);
};
