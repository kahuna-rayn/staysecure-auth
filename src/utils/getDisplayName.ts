/**
 * Gets the displayName (site badge text) from the URL and client configuration.
 * 
 * Since the auth module is pre-built, it can't access VITE_CLIENT_CONFIGS env var directly.
 * Instead:
 * 1. Determine clientId from URL:
 *    - Subdomain-based (dev/staging): dev.staysecure-learn.raynsecure.com → 'default'
 *    - Path-based (clients): staysecure-learn.raynsecure.com/nexus/forgot-password → 'nexus'
 * 2. Look up displayName in window.__CLIENT_CONFIGS__ (set by consuming app)
 * 
 * URL patterns:
 * - dev.staysecure-learn.raynsecure.com/forgot-password → default client
 * - staysecure-learn.raynsecure.com/forgot-password → default client
 * - staysecure-learn.raynsecure.com/nexus/forgot-password → nexus client
 */
export const getDisplayName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const hostname = window.location.hostname;
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const firstSegment = pathParts[0];
    
    // List of known auth routes that are NOT clientIds
    const authRoutes = ['forgot-password', 'reset-password', 'activate-account', 'signup', 'login'];
    
    // Determine clientId from URL
    let clientId: string = 'default';
    
    // Check if this is dev/staging (subdomain-based) - always use 'default'
    if (hostname.includes('dev.') || hostname.includes('staging.')) {
      clientId = 'default';
    }
    // Otherwise, check path for clientId
    else if (firstSegment && !authRoutes.includes(firstSegment)) {
      // First segment is a clientId (e.g., /nexus/forgot-password → 'nexus')
      clientId = firstSegment;
    }
    // If no clientId in path and not dev/staging, use 'default'
    
    console.log('[getDisplayName] URL:', window.location.href);
    console.log('[getDisplayName] hostname:', hostname, 'pathname:', window.location.pathname, '→ clientId:', clientId);
    
    // Get CLIENT_CONFIGS from window global (set by consuming app)
    const clientConfigs = (window as any).__CLIENT_CONFIGS__;
    if (!clientConfigs) {
      console.log('[getDisplayName] window.__CLIENT_CONFIGS__ not found');
      return null;
    }
    
    // Look up the client config
    const clientConfig = clientConfigs[clientId] || clientConfigs['default'];
    const displayName = clientConfig?.displayName || null;
    
    console.log('[getDisplayName] Resolved displayName:', displayName, 'for clientId:', clientId);
    return displayName;
  } catch (e) {
    console.error('[getDisplayName] Error:', e);
    // Silently fail - badge is optional
    return null;
  }
};

