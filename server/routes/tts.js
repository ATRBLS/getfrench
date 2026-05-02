const express = require('express');
const { Readable } = require('stream');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();

const VOICE_ID = 'kgG7dCoKTkybBDH8UsV7'; // Charlotte — natural French female voice

function cefrToSpeed(level) {
  if (!level) return 1.0;
  const l = level.toUpperCase();
  if (l === 'A1' || l === 'A2') return 0.85;
  if (l === 'C1' || l === 'C2') return 1.1;
  return 1.0; // B1/B2
}

router.post('/', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' });

  // Look up CEFR level for adaptive speech speed — fail open to 1.0
  let speed = 1.0;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('cefr_level')
      .eq('id', req.user.id)
      .single();
    speed = cefrToSpeed(user?.cefr_level);
  } catch {}

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
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.3, similarity_boost: 0.75 },
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
