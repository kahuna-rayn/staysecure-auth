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
    if (!clientConfigs) {
      return null;
    }

    const parsed = JSON.parse(clientConfigs);
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const clientId = pathParts[0];

    // Get the config for the current client or fall back to 'default'
    const currentClientConfig = parsed[clientId] || parsed['default'];
    return currentClientConfig?.displayName || null;
  } catch (e) {
    // Silently fail - badge is optional
    return null;
  }
};

