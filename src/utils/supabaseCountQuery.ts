import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches session counts for checkout_sessions table with proper filtering
 * Uses Supabase's count feature to bypass the 1000 record limit
 */
export async function getSessionsCount(
  productIds: string[],
  startDate: Date,
  endDate?: Date
): Promise<number> {
  let query = supabase
    .from('checkout_sessions')
    .select('*', { count: 'exact', head: true })
    .in('product_id', productIds)
    .gte('created_at', startDate.toISOString());

  if (endDate) {
    query = query.lt('created_at', endDate.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting sessions count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Fetches all session counts (for admin - no product filter)
 * Uses Supabase's count feature to bypass the 1000 record limit
 */
export async function getAllSessionsCount(
  startDate: Date,
  endDate?: Date
): Promise<number> {
  let query = supabase
    .from('checkout_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString());

  if (endDate) {
    query = query.lt('created_at', endDate.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting all sessions count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Fetches orders count with filters
 * Uses Supabase's count feature to bypass the 1000 record limit
 */
export async function getOrdersCount(
  productIds: string[],
  status: string | null,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('product_id', productIds);

  if (status) {
    query = query.eq('status', status);
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lt('created_at', endDate.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting orders count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Fetches all orders count (for admin - no product filter)
 * Uses Supabase's count feature to bypass the 1000 record limit
 */
export async function getAllOrdersCount(
  status: string | null,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if (status) {
    query = query.eq('status', status);
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lt('created_at', endDate.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting all orders count:', error);
    return 0;
  }

  return count || 0;
}

interface SessionLocationData {
  country: string | null;
  city: string | null;
  region: string | null;
}

/**
 * Fetches all sessions with location data using pagination
 * This is needed when we need actual data (not just count) beyond 1000 records
 */
export async function getAllSessionsWithLocation(
  productIds: string[] | null,
  startDate: Date,
  endDate?: Date,
  batchSize: number = 1000
): Promise<SessionLocationData[]> {
  const allData: SessionLocationData[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('checkout_sessions')
      .select('country, city, region')
      .gte('created_at', startDate.toISOString())
      .range(offset, offset + batchSize - 1);

    if (productIds && productIds.length > 0) {
      query = query.in('product_id', productIds);
    }

    if (endDate) {
      query = query.lt('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }
  }

  return allData;
}
