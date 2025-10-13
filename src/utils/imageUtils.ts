/**
 * Utility function to get the correct product image URL
 * Handles Cloudflare R2, Bunny CDN, Supabase Storage URLs, data URLs, and Unsplash IDs
 * Backward compatible with old Supabase Storage URLs and Bunny CDN
 */
export const getProductImageUrl = (cover: string, fallback?: string): string => {
  if (!cover) return fallback || "/placeholder.svg";
  
  // Data URLs (base64 encoded images)
  if (cover.startsWith('data:')) {
    return cover;
  }
  
  // Cloudflare R2, Bunny CDN URLs, Supabase Storage URLs or any complete HTTP URLs
  if (cover.includes('supabase') || cover.includes('bunnycdn') || cover.includes('b-cdn.net') || cover.includes('r2.dev') || cover.includes('r2.cloudflarestorage.com') || cover.startsWith('http')) {
    return cover;
  }
  
  // Legacy Unsplash IDs - maintain backward compatibility
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