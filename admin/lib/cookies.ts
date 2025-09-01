export const ADMIN_TOKEN_COOKIE = 'hb_admin_token';
export const COOKIE_MAX_AGE_DAYS = 7;

export function buildAuthCookie(token: string, isProd: boolean): string {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60; // seconds
  const parts = [
    `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    `HttpOnly`,
    `Path=/`,
    `SameSite=Strict`,
    `Max-Age=${maxAge}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCookie(isProd: boolean): string {
  const parts = [
    `${ADMIN_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}


