/**
 * App configuration utilities
 * Centralizes access to environment variables and app settings
 */

/**
 * Get the backend URL from environment variables
 * Falls back to localhost for development
 */
export function getBackendUrl(): string {
  // Check for Vibecode backend URL first (set by the platform)
  const vibecodeUrl = process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL;
  if (vibecodeUrl) {
    return vibecodeUrl;
  }

  // Check for general backend URL
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    return backendUrl;
  }

  // Fallback to localhost for development
  return "http://localhost:3000";
}

/**
 * Check if we're running in development mode
 */
export function isDevelopment(): boolean {
  return __DEV__;
}
