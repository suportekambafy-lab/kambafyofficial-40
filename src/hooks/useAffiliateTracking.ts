import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Cookie utilities for cross-subdomain persistence
const COOKIE_NAME = 'kambafy_affiliate_code';
const COOKIE_DOMAIN = '.kambafy.com';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const WINDOW_NAME_PREFIX = 'kambafy_ref:';
const LOCAL_STORAGE_KEY = 'affiliate_code';

/**
 * Set a cookie with cross-subdomain support
 */
function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void {
  try {
    // Check if we're on kambafy.com domain
    const hostname = window.location.hostname;
    const isKambafyDomain = hostname.includes('kambafy.com');
    
    let cookieString = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    
    // Only set domain for kambafy.com (not for localhost/preview domains)
    if (isKambafyDomain) {
      cookieString += `; domain=${COOKIE_DOMAIN}`;
    }
    
    document.cookie = cookieString;
    console.log('🍪 Cookie set:', { name, value, isKambafyDomain });
  } catch (error) {
    console.error('Error setting cookie:', error);
  }
}

/**
 * Get a cookie value
 */
function getCookie(name: string): string | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name && cookieValue) {
        const decoded = decodeURIComponent(cookieValue);
        console.log('🍪 Cookie found:', { name, value: decoded });
        return decoded;
      }
    }
  } catch (error) {
    console.error('Error reading cookie:', error);
  }
  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  try {
    const hostname = window.location.hostname;
    const isKambafyDomain = hostname.includes('kambafy.com');
    
    let cookieString = `${name}=; path=/; max-age=0; SameSite=Lax`;
    if (isKambafyDomain) {
      cookieString += `; domain=${COOKIE_DOMAIN}`;
    }
    document.cookie = cookieString;
    console.log('🍪 Cookie deleted:', name);
  } catch (error) {
    console.error('Error deleting cookie:', error);
  }
}

/**
 * Save affiliate code to window.name (persists across subdomain navigation in same tab)
 */
function setWindowNameCode(code: string): void {
  try {
    // Parse existing window.name data
    const currentName = window.name || '';
    const prefix = WINDOW_NAME_PREFIX;
    
    // Remove any existing affiliate code from window.name
    let cleanedName = currentName;
    const prefixIndex = currentName.indexOf(prefix);
    if (prefixIndex !== -1) {
      const endIndex = currentName.indexOf(';', prefixIndex);
      if (endIndex !== -1) {
        cleanedName = currentName.slice(0, prefixIndex) + currentName.slice(endIndex + 1);
      } else {
        cleanedName = currentName.slice(0, prefixIndex);
      }
    }
    
    // Add new code
    window.name = `${prefix}${code};${cleanedName}`.trim();
    console.log('🪟 window.name set with affiliate code:', code);
  } catch (error) {
    console.error('Error setting window.name:', error);
  }
}

/**
 * Get affiliate code from window.name
 */
function getWindowNameCode(): string | null {
  try {
    const name = window.name || '';
    const prefix = WINDOW_NAME_PREFIX;
    const prefixIndex = name.indexOf(prefix);
    
    if (prefixIndex !== -1) {
      const startIndex = prefixIndex + prefix.length;
      const endIndex = name.indexOf(';', startIndex);
      const code = endIndex !== -1 
        ? name.slice(startIndex, endIndex)
        : name.slice(startIndex);
      
      if (code) {
        console.log('🪟 window.name affiliate code found:', code);
        return code;
      }
    }
  } catch (error) {
    console.error('Error reading window.name:', error);
  }
  return null;
}

/**
 * Clear affiliate code from window.name
 */
function clearWindowNameCode(): void {
  try {
    const currentName = window.name || '';
    const prefix = WINDOW_NAME_PREFIX;
    const prefixIndex = currentName.indexOf(prefix);
    
    if (prefixIndex !== -1) {
      const endIndex = currentName.indexOf(';', prefixIndex);
      if (endIndex !== -1) {
        window.name = currentName.slice(0, prefixIndex) + currentName.slice(endIndex + 1);
      } else {
        window.name = currentName.slice(0, prefixIndex);
      }
      console.log('🪟 window.name affiliate code cleared');
    }
  } catch (error) {
    console.error('Error clearing window.name:', error);
  }
}

/**
 * Get the affiliate code from all available sources, in priority order:
 * 1. URL parameter (?ref=)
 * 2. Cookie (cross-subdomain)
 * 3. window.name (same tab, cross-subdomain)
 * 4. localStorage (same subdomain only)
 */
export function getAffiliateCodeFromAllSources(): string | null {
  // 1. Check URL first (highest priority - user clicked a new affiliate link)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    if (refFromUrl) {
      console.log('🔗 Affiliate code from URL:', refFromUrl);
      return refFromUrl;
    }
  } catch (error) {
    console.error('Error reading URL params:', error);
  }
  
  // 2. Check cookie (cross-subdomain persistence)
  const cookieCode = getCookie(COOKIE_NAME);
  if (cookieCode) {
    return cookieCode;
  }
  
  // 3. Check window.name (same tab persistence across subdomains)
  const windowNameCode = getWindowNameCode();
  if (windowNameCode) {
    return windowNameCode;
  }
  
  // 4. Check localStorage (same subdomain fallback)
  try {
    const storedCode = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedCode) {
      console.log('🔗 Affiliate code from localStorage:', storedCode);
      return storedCode;
    }
  } catch (error) {
    console.error('Error reading localStorage:', error);
  }
  
  return null;
}

/**
 * Save affiliate code to all persistence layers
 */
function saveAffiliateCodeToAllSources(code: string): void {
  // Save to cookie (cross-subdomain)
  setCookie(COOKIE_NAME, code);
  
  // Save to window.name (same tab cross-subdomain)
  setWindowNameCode(code);
  
  // Save to localStorage (same subdomain)
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, code);
    console.log('💾 Affiliate code saved to localStorage:', code);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Clear affiliate code from all persistence layers
 */
function clearAffiliateCodeFromAllSources(): void {
  deleteCookie(COOKIE_NAME);
  clearWindowNameCode();
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log('🧹 Affiliate code cleared from all sources');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

export function useAffiliateTracking() {
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [isValidAffiliate, setIsValidAffiliate] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    // Get affiliate code from all sources with priority
    const code = getAffiliateCodeFromAllSources();
    
    if (code) {
      console.log('🔗 Affiliate code detected:', code);
      setAffiliateCode(code);
      setIsValidAffiliate(false); // Will be validated during checkout
      
      // Persist to all sources (ensures cross-subdomain availability)
      saveAffiliateCodeToAllSources(code);
    } else {
      // No code found anywhere - clear state but don't actively clear storage
      // (might be intentional absence vs. lost code)
      console.log('🔗 No affiliate code found in any source');
      setAffiliateCode(null);
    }
  }, [location.search]);

  const clearAffiliateCode = useCallback(() => {
    console.log('🧹 Explicitly clearing affiliate code');
    setAffiliateCode(null);
    setIsValidAffiliate(false);
    clearAffiliateCodeFromAllSources();
  }, []);

  const markAsValidAffiliate = useCallback(() => {
    setIsValidAffiliate(true);
  }, []);

  const markAsInvalidAffiliate = useCallback(() => {
    setIsValidAffiliate(false);
    // Note: We don't clear the code here anymore - validation failure is informational
    // The code remains available for the backend to re-validate
  }, []);

  /**
   * Get the current affiliate code from all sources
   * This can be called at any time to get the most up-to-date code
   */
  const getCurrentAffiliateCode = useCallback((): string | null => {
    return getAffiliateCodeFromAllSources();
  }, []);

  return {
    affiliateCode,
    hasAffiliate: !!affiliateCode,
    isValidAffiliate,
    clearAffiliateCode,
    markAsValidAffiliate,
    markAsInvalidAffiliate,
    getCurrentAffiliateCode,
    // Export the static function for use outside the hook
    getAffiliateCodeFromAllSources
  };
}
