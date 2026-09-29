export const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('etebox_admin_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('etebox_admin_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('etebox_admin_token');
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event('auth_expired'));
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}
