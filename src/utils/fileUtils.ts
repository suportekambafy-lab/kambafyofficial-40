/**
 * File utility functions for handling files from different storage providers
 * Maintains backward compatibility with Supabase Storage while supporting Bunny CDN
 */

/**
 * Get the correct URL for any file (images, ebooks, materials, videos)
 * Works with both Bunny CDN (new) and Supabase Storage (legacy)
 */
export const getFileUrl = (url: string | null | undefined, fallback?: string): string => {
  if (!url) return fallback || "";
  
  // Already a complete URL - works for both Bunny CDN and Supabase Storage
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Data URLs (base64)
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Legacy relative paths or partial URLs - return as is
  return url;
};

/**
 * Check if a URL is from Supabase Storage (legacy system)
 */
export const isLegacySupabaseUrl = (url: string): boolean => {
  return url.includes('supabase.co/storage') || url.includes('supabase.co/object');
};

/**
 * Check if a URL is from Bunny CDN (new system)
 */
export const isBunnyUrl = (url: string): boolean => {
  return url.includes('bunnycdn.net') || url.includes('b-cdn.net') || url.includes('bunny.net');
};

/**
 * Get storage provider from URL
 */
export const getStorageProvider = (url: string): 'bunny' | 'supabase' | 'other' => {
  if (isBunnyUrl(url)) return 'bunny';
  if (isLegacySupabaseUrl(url)) return 'supabase';
  return 'other';
};

/**
 * Download a file from any storage provider
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || url.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
};

/**
 * Get file extension from URL or filename
 */
export const getFileExtension = (url: string): string => {
  const filename = url.split('?')[0].split('/').pop() || '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Check if URL is a video file
 */
export const isVideoFile = (url: string): boolean => {
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm3u8'];
  const ext = getFileExtension(url);
  return videoExtensions.includes(ext);
};

/**
 * Check if URL is an image file
 */
export const isImageFile = (url: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const ext = getFileExtension(url);
  return imageExtensions.includes(ext);
};

/**
 * Check if URL is a document file
 */
export const isDocumentFile = (url: string): boolean => {
  const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'epub', 'xls', 'xlsx', 'ppt', 'pptx'];
  const ext = getFileExtension(url);
  return docExtensions.includes(ext);
};
