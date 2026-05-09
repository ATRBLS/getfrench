require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { WebSocketServer } = require('ws');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const sessionRoutes = require('./routes/sessions');
const stripeRoutes = require('./routes/stripe');
const ttsRoute = require('./routes/tts');
const setupDeepgramWS = require('./routes/deepgram');

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhooks need raw body — mount before json middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'https://getfrench.app',
  'https://www.getfrench.app',
  'https://getfrench.vercel.app', // keep during DNS propagation
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/tts', ttsRoute);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(PORT, () => console.log(`Speakr server running on :${PORT}`));

// WebSocket for Deepgram STT proxy — shares the same port as HTTP
const wss = new WebSocketServer({ server, path: '/api/deepgram' });
setupDeepgramWS(wss);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the existing process first:\n  lsof -ti :${PORT} | xargs kill`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
