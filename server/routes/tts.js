const express = require('express');
const { Readable } = require('stream');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah — French multilingual female voice

// Per-user speed override set by the client toggle (in-memory, resets on restart).
// Keys: user id  Values: 0.75 | 1.0 | 1.25
const speedPrefs = new Map();

function cefrToSpeed(level) {
  if (!level) return 1.0;
  const l = level.toUpperCase();
  if (l === 'A1' || l === 'A2') return 0.85;
  if (l === 'C1' || l === 'C2') return 1.1;
  return 1.0; // B1/B2
}

// POST /api/tts/set-speed — store user's manual speed preference
router.post('/set-speed', requireAuth, (req, res) => {
  const { speed } = req.body;
  const valid = [0.75, 1.0, 1.25];
  if (!valid.includes(speed)) return res.status(400).json({ error: 'speed must be 0.75, 1.0, or 1.25' });
  speedPrefs.set(req.user.id, speed);
  res.json({ ok: true });
});

router.post('/', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' });

  // Manual override takes priority; fall back to CEFR-adaptive speed
  let speed = speedPrefs.get(req.user.id) ?? null;
  if (speed === null) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('cefr_level')
        .eq('id', req.user.id)
        .single();
      speed = cefrToSpeed(user?.cefr_level);
    } catch {
      speed = 1.0;
    }
  }

  console.log('[TTS] text length:', text.trim().length, '| preview:', text.trim().slice(0, 40), '| speed:', speed);

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
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
          speed,
        }),
      }
    );

    console.log('[TTS] ElevenLabs status:', elevenRes.status);

    if (!elevenRes.ok) {
      const err = await elevenRes.text();
      console.error('[TTS] ElevenLabs error body:', err);
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
