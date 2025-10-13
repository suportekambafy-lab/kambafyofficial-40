/**
 * Utility function to get the correct product image URL
 * Handles Cloudflare R2, Bunny CDN, Supabase Storage URLs, data URLs, and Unsplash IDs
 * Priority: Cloudflare R2 > Bunny CDN (legacy) > Supabase Storage (legacy) > Unsplash (fallback)
 */
export const getProductImageUrl = (cover: string, fallback?: string): string => {
  if (!cover) return fallback || "/placeholder.svg";
  
  // Data URLs (base64 encoded images)
  if (cover.startsWith('data:')) {
    return cover;
  }
  
  // Priority 1: Cloudflare R2 (current standard)
  if (cover.includes('r2.dev') || cover.includes('r2.cloudflarestorage.com')) {
    return cover;
  }
  
  // Priority 2: Bunny CDN (legacy - backward compatibility)
  if (cover.includes('bunnycdn') || cover.includes('b-cdn.net')) {
    return cover;
  }
  
  // Priority 3: Supabase Storage (legacy)
  if (cover.includes('supabase')) {
    return cover;
  }
  
  // Priority 4: Any other HTTP URLs
  if (cover.startsWith('http')) {
    return cover;
  }
  
  // Fallback: Legacy Unsplash IDs
  return `https://images.unsplash.com/${cover}`;
};

/**
 * Utility function to get the correct file URL (ebooks, materials, etc)
 * Handles both Bunny CDN and legacy Supabase Storage URLs
 */
export const getFileUrl = (fileUrl: string, fallback?: string): string => {
  if (!fileUrl) return fallback || "";
  
  // Already a complete URL (Bunny CDN or Supabase Storage)
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  // Legacy relative paths - should not happen, but just in case
  return fileUrl;
};

/**
 * Check if a URL is from Supabase Storage (legacy)
 */
export const isSupabaseStorageUrl = (url: string): boolean => {
  return url.includes('supabase.co/storage');
};

/**
 * Check if a URL is from Bunny CDN
 */
export const isBunnyCdnUrl = (url: string): boolean => {
  return url.includes('bunnycdn.net') || url.includes('b-cdn.net');
};

/**
 * Check if a URL is from Cloudflare R2
 */
export const isCloudflareR2Url = (url: string): boolean => {
  return url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com');
};

/**
 * Get the storage provider from a URL
 */
export const getStorageProvider = (url: string): 'cloudflare' | 'bunny' | 'supabase' | 'other' => {
  if (isCloudflareR2Url(url)) return 'cloudflare';
  if (isBunnyCdnUrl(url)) return 'bunny';
  if (isSupabaseStorageUrl(url)) return 'supabase';
  return 'other';
};