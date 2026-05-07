const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('getfrench_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || body.error || 'Request failed');
    err.code = body.error;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  googleAuth: (credential) => request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  sendMagicLink: (email) => request('/api/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyMagicLink: (token) => request('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  getMe: () => request('/api/sessions/me'),
  startSession: () => request('/api/sessions/start', { method: 'POST' }),
  endSession: (data) => request('/api/sessions/end', { method: 'POST', body: JSON.stringify(data) }),
  summarize: (data) => request('/api/chat/summarize', { method: 'POST', body: JSON.stringify(data) }),
  checkout: (data) => request('/api/stripe/checkout', { method: 'POST', body: JSON.stringify(data) }),
  stripePortal: () => request('/api/stripe/portal', { method: 'POST' }),
  setTtsSpeed: (speed) => request('/api/tts/set-speed', { method: 'POST', body: JSON.stringify({ speed }) }),
  getSuggestions: (data) => request('/api/chat/suggestions', { method: 'POST', body: JSON.stringify(data) }),
  post: (endpoint, body) => request(`/api${endpoint}`, { method: 'POST', body: JSON.stringify(body) }),
};

export async function streamMessage(messages, session_id, corrMode, levelOverride, crosstalk, helpMode, scenario, customScenario, onChunk) {
  const token = getToken();
  const res = await fetch(`${BASE}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, session_id, corrMode, levelOverride, crosstalk, helpMode, scenario, customScenario }),
  });

  if (!res.ok) throw new Error('Chat failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const { text } = JSON.parse(data);
          onChunk(text);
        } catch {}
      }
    }
  }
}
