const express = require('express');
const { Readable } = require('stream');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();

const VOICE_ID = 'MNKK2Wl2wbbsEPQTHZGt';

// Cache-aside: Map for fast access, Supabase for persistence across restarts.
const speedCache = new Map();

function cefrToSpeed() {
  return 1.0; // Speed is user-controlled via settings, not auto-adjusted by CEFR
}

// POST /api/tts/set-speed
router.post('/set-speed', requireAuth, async (req, res) => {
  const { speed } = req.body;
  const valid = [0.7, 1.0, 1.2];
  if (!valid.includes(speed)) return res.status(400).json({ error: 'speed must be 0.7, 1.0, or 1.2' });

  // Update cache immediately
  speedCache.set(req.user.id, speed);

  // Persist to Supabase in the background
  supabase
    .from('users')
    .select('memory')
    .eq('id', req.user.id)
    .single()
    .then(({ data }) => {
      const memory = { ...(data?.memory || {}), tts_speed: speed };
      return supabase.from('users').update({ memory }).eq('id', req.user.id);
    })
    .catch(err => console.error('[TTS] set-speed Supabase error:', err.message));

  console.log('[TTS] speed set for user', req.user.id, '→', speed);
  res.json({ ok: true });
});

router.post('/', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' });

  // Cache hit: no Supabase read needed (fast path)
  let speed = speedCache.get(req.user.id) ?? null;

  if (speed === null) {
    // Cache miss: read from Supabase once, then populate cache
    try {
      const { data: user } = await supabase
        .from('users')
        .select('cefr_level, memory')
        .eq('id', req.user.id)
        .single();

      if (user?.memory?.tts_speed != null) {
        speed = user.memory.tts_speed;
        speedCache.set(req.user.id, speed);
      } else {
        speed = cefrToSpeed(user?.cefr_level);
      }
    } catch {
      speed = 1.0;
    }
  }

  console.log('[TTS] user:', req.user.id, '| speed:', speed, '| text:', text.trim().slice(0, 40));

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true, speed: speed ?? 1.0 },
          optimize_streaming_latency: 3,
        }),
      }
    );

    console.log('[TTS] ElevenLabs status:', elevenRes.status);

    if (!elevenRes.ok) {
      const err = await elevenRes.text();
      console.error('[TTS] ElevenLabs error:', err);
      return res.status(502).json({ error: 'TTS failed', detail: err });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    Readable.fromWeb(elevenRes.body).pipe(res);
  } catch (err) {
    console.error('[TTS] exception:', err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

module.exports = router;
