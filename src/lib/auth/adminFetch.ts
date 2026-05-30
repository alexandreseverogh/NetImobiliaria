/**
 * Helper de autenticação para fetch do lado cliente no painel admin.
 * Lê o token de localStorage (chave 'admin-auth-token') e injeta
 * o header Authorization: Bearer — espelhando o comportamento do useApi hook.
 */

export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin-auth-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** fetch autenticado — drop-in para o fetch nativo em Client Components admin */
export async function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}
