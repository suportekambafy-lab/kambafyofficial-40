/**
 * Utility for auth redirects that ensures production always goes to app.kambafy.com
 */

type AuthMode = 'login' | 'signup';

interface AuthRedirectOptions {
  mode?: AuthMode;
  type?: 'customer' | 'seller';
  error?: string;
  replace?: boolean;
}

/**
 * Returns the correct auth URL for the current environment
 */
export function getAuthUrl(options: AuthRedirectOptions = {}): string {
  const { mode = 'login', type, error } = options;
  const hostname = window.location.hostname;
  const isProduction = hostname.includes('kambafy.com') && 
                       !hostname.includes('localhost') && 
                       !hostname.includes('lovable.app');
  
  // Build query string
  const params = new URLSearchParams();
  params.set('mode', mode);
  if (type) params.set('type', type);
  if (error) params.set('error', error);
  
  const queryString = params.toString();
  const path = `/auth?${queryString}`;
  
  if (isProduction) {
    return `${window.location.protocol}//app.kambafy.com${path}`;
  }
  
  return path;
}

/**
 * Redirects to the auth page, ensuring production goes to app.kambafy.com
 */
export function redirectToAuth(options: AuthRedirectOptions = {}): void {
  const url = getAuthUrl(options);
  const hostname = window.location.hostname;
  const isProduction = hostname.includes('kambafy.com') && 
                       !hostname.includes('localhost') && 
                       !hostname.includes('lovable.app');
  
  if (isProduction && !hostname.startsWith('app.')) {
    // Always use full redirect for cross-subdomain
    window.location.href = url;
  } else if (options.replace) {
    window.location.replace(url);
  } else {
    window.location.href = url;
  }
}

/**
 * Check if we're in production environment
 */
export function isProductionEnvironment(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes('kambafy.com') && 
         !hostname.includes('localhost') && 
         !hostname.includes('lovable.app');
}

/**
 * Get the app subdomain URL for a given path
 */
export function getAppSubdomainUrl(path: string): string {
  const hostname = window.location.hostname;
  const isProduction = hostname.includes('kambafy.com') && 
                       !hostname.includes('localhost') && 
                       !hostname.includes('lovable.app');
  
  if (isProduction) {
    return `${window.location.protocol}//app.kambafy.com${path}`;
  }
  
  return path;
}
