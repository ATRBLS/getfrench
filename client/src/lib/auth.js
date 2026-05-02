export function saveAuth(token, user) {
  localStorage.setItem('getfrench_token', token);
  localStorage.setItem('getfrench_user', JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('getfrench_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('getfrench_token');
}

export function clearAuth() {
  localStorage.removeItem('getfrench_token');
  localStorage.removeItem('getfrench_user');
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
