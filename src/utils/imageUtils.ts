/**
 * Utility function to get the correct product image URL
 * Handles Bunny CDN, Supabase Storage URLs, data URLs, and Unsplash IDs
 */
export const getProductImageUrl = (cover: string, fallback?: string): string => {
  if (!cover) return fallback || "/placeholder.svg";
  
  // Data URLs (base64 encoded images)
  if (cover.startsWith('data:')) {
    return cover;
  }
  
  // Bunny CDN URLs, Supabase Storage URLs or any complete HTTP URLs
  if (cover.includes('supabase') || cover.includes('bunnycdn') || cover.startsWith('http')) {
    return cover;
  }
  
  // Legacy Unsplash IDs - maintain backward compatibility
  return `https://images.unsplash.com/${cover}`;
};