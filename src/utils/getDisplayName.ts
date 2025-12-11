/**
 * Gets the displayName (site badge text) from VITE_CLIENT_CONFIGS environment variable.
 * This matches the logic used in learn/src/hooks/useClient.ts
 */
export const getDisplayName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const clientConfigs = import.meta.env.VITE_CLIENT_CONFIGS;
        // Debug logging
        console.log('[getDisplayName] VITE_CLIENT_CONFIGS:', clientConfigs);
        console.log('[getDisplayName] VITE_CLIENT_CONFIGS exists:', !!import.meta.env.VITE_CLIENT_CONFIGS);
    if (!clientConfigs) {
      return null;
    }

    const parsed = JSON.parse(clientConfigs);
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const firstSegment = pathParts[0];
    
    // List of known auth routes that are NOT clientIds
    const authRoutes = ['forgot-password', 'reset-password', 'activate-account', 'signup', 'login'];
    
    // Check if first segment is a valid clientId (exists in config) and not an auth route
    let clientId: string | null = null;
    if (firstSegment && parsed[firstSegment] && !authRoutes.includes(firstSegment)) {
      clientId = firstSegment;
    } else {
      // Fall back to 'default'
      clientId = 'default';
    }

    // Get the config for the current client
    const currentClientConfig = parsed[clientId];
    return currentClientConfig?.displayName || null;
  } catch (e) {
    // Silently fail - badge is optional
    return null;
  }
};

