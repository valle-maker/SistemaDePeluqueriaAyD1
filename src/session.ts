// Session storage for the logged-in user. The token lives in sessionStorage (cleared when the tab
// closes), next to the role/name flags App.tsx already keeps there.
const TOKEN_KEY = 'bb_token';

export const SESSION_KEY_AUTH = 'bb_auth';
export const SESSION_KEY_ROLE = 'bb_role';
export const SESSION_KEY_USER_NAME = 'bb_user_name';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Drops everything that identifies the user in this tab.
export function clearSession() {
  clearToken();
  sessionStorage.removeItem(SESSION_KEY_AUTH);
  sessionStorage.removeItem(SESSION_KEY_ROLE);
  sessionStorage.removeItem(SESSION_KEY_USER_NAME);
}
