/**
 * Get a cookie value by name (client-side only)
 */
export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }

  return null;
};

/**
 * Get access token from cookie
 */
export const getAccessToken = (): string | null => {
  return getCookie('accessToken');
};
