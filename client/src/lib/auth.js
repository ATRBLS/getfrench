export function saveAuth(token, user) {
  localStorage.setItem('speakr_token', token);
  localStorage.setItem('speakr_user', JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('speakr_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('speakr_token');
}

export function clearAuth() {
  localStorage.removeItem('speakr_token');
  localStorage.removeItem('speakr_user');
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
