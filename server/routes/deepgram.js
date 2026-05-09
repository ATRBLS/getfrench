const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const jwt = require('jsonwebtoken');

const ALLOWED_ORIGINS = [
  'http://localhost:5173', 'http://localhost:5174',
  'http://localhost:5175', 'http://localhost:5176',
  'https://getfrench.app',
  'https://www.getfrench.app',
  'https://getfrench.vercel.app', // keep during DNS propagation
];
if (process.env.FRONTEND_URL) ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);

function setupDeepgramWS(wss) {
  wss.on('connection', (ws, req) => {
    // Origin check
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      ws.close(1008, 'Forbidden origin');
      return;
    }

    // JWT auth from query string
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const dg = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
    });

    let accumulated = '';

    dg.on(LiveTranscriptionEvents.Open, () => {
      ws.send(JSON.stringify({ type: 'ready' }));
    });

    dg.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alt = data.channel?.alternatives?.[0];
      if (!alt?.transcript) return;

      if (data.is_final) {
        accumulated += (accumulated ? ' ' : '') + alt.transcript;
      }
      // Send interim for live display on client
      ws.send(JSON.stringify({
        type: data.is_final ? 'final' : 'interim',
        text: alt.transcript,
      }));
    });

    // UtteranceEnd fires after ~1s of silence — send the full sentence
    dg.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      const text = accumulated.trim();
      accumulated = '';
      if (text) ws.send(JSON.stringify({ type: 'transcript', text }));
    });

    dg.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('Deepgram error:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message || 'STT error' }));
    });

    dg.on(LiveTranscriptionEvents.Close, () => {
      if (ws.readyState === ws.OPEN) ws.close();
    });

    ws.on('message', (data) => {
      if (dg.getReadyState() === 1) dg.send(data);
    });

    ws.on('close', () => { try { dg.finish(); } catch {} });
    ws.on('error', (err) => { console.error('Client WS error:', err.message); try { dg.finish(); } catch {} });
  });
}

module.exports = setupDeepgramWS;
