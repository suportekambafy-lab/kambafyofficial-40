/**
 * File utility functions for handling files from different storage providers
 * Priority: Cloudflare R2 (current) > Bunny CDN (legacy) > Supabase Storage (legacy)
 */

/**
 * Get the correct URL for any file (images, ebooks, materials, videos)
 * Priority handling: Cloudflare R2 (current) > Bunny CDN (legacy) > Supabase Storage (legacy)
 */
export const getFileUrl = (url: string | null | undefined, fallback?: string): string => {
  if (!url) return fallback || "";
  
  // Already a complete URL - works for all storage providers
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Data URLs (base64)
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Priority 1: Cloudflare R2 URL without protocol
  if (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com')) {
    return `https://${url}`;
  }
  
  // Priority 2: Bunny CDN URL without protocol (legacy backward compatibility)
  if (url.includes('bunnycdn.net') || url.includes('b-cdn.net') || url.includes('bunny.net')) {
    return `https://${url}`;
  }
  
  // Priority 3: Supabase URL without protocol (legacy backward compatibility)
  if (url.includes('supabase.co')) {
    return `https://${url}`;
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
 * Check if a URL is from Bunny CDN (legacy system)
 */
export const isBunnyUrl = (url: string): boolean => {
  return url.includes('bunnycdn.net') || url.includes('b-cdn.net') || url.includes('bunny.net');
};

/**
 * Check if a URL is from Cloudflare R2 (current system)
 */
export const isCloudflareR2Url = (url: string): boolean => {
  return url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com');
};

/**
 * Get storage provider from URL
 */
export const getStorageProvider = (url: string): 'cloudflare' | 'bunny' | 'supabase' | 'other' => {
  if (isCloudflareR2Url(url)) return 'cloudflare';
  if (isBunnyUrl(url)) return 'bunny';
  if (isLegacySupabaseUrl(url)) return 'supabase';
  return 'other';
};

/**
 * Check if browser is Safari
 */
export const isSafari = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
};

/**
 * Open file in browser (Safari-compatible)
 * Safari has issues with direct window.open for PDFs from CDN
 */
export const openFile = async (url: string, filename?: string): Promise<void> => {
  try {
    // For Safari, fetch and create blob URL to avoid CORS issues
    if (isSafari() && isDocumentFile(url)) {
      console.log('🍎 Safari detected - using blob URL for document');
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(blobUrl, '_blank');
      
      // Clean up after a delay to ensure it opens
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);
      
      if (!newWindow) {
        throw new Error('Popup blocked');
      }
    } else {
      // For other browsers or non-document files, use direct open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.error('Error opening file:', error);
    // Fallback: try to download
    downloadFile(url, filename);
  }
};

/**
 * Download a file from any storage provider
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) throw new Error('Failed to fetch file');
    
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
    window.open(url, '_blank', 'noopener,noreferrer');
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
