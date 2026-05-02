const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { randomUUID } = require('crypto');
const supabase = require('../lib/supabase');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getResend() {
  const key = process.env.RESEND_API_KEY;
  console.log('Resend init — key starts with:', key?.substring(0, 10), '| full length:', key?.length);
  return new Resend(key);
}

function makeJWT(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function upsertUser({ id, email, name }) {
  const { data: existing, error: selErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (selErr && selErr.code !== 'PGRST116') throw selErr;
  if (existing) return existing;

  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: id || randomUUID(),
      email,
      name: name || email.split('@')[0],
      plan: 'free',
      sessions_this_month: 0,
      seconds_used: 0,
      reset_date: resetDate,
      memory: {},
      stripe_customer_id: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Google OAuth — verify ID token from frontend
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    console.log('GOOGLE_CLIENT_ID loaded:', process.env.GOOGLE_CLIENT_ID?.slice(0, 20));
    console.log('credential received, length:', credential?.length);

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      console.log('Google ticket:', ticket.getPayload());
    } catch (err) {
      console.error('Google verify error:', err.message);
      throw err;
    }

    const { sub, email, name } = ticket.getPayload();
    const user = await upsertUser({ id: sub, email, name });
    res.json({ token: makeJWT(user), user });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(400).json({ error: 'Google auth failed', detail: err.message });
  }
});

// Magic link — send email
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    console.log('Attempting to send email to:', email);

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const link = `${process.env.VITE_APP_URL}/auth/verify?token=${token}`;

    const { data, error } = await getResend().emails.send({
      from: 'Speakr <onboarding@resend.dev>',
      to: email,
      subject: 'Your Speakr login link',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:40px">
          <h2 style="font-size:24px;margin-bottom:8px">Sign in to Speakr</h2>
          <p style="color:#666;margin-bottom:32px">Click the button below to sign in. This link expires in 15 minutes.</p>
          <a href="${link}" style="background:#fff;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Sign in →</a>
          <p style="color:#999;margin-top:32px;font-size:13px">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });

    console.log('Resend response:', JSON.stringify(data));
    console.log('Resend error:', JSON.stringify(error));

    if (error) return res.status(500).json({ error: 'Failed to send magic link', detail: error.message });

    res.json({ ok: true });
  } catch (err) {
    console.error('Magic link exception:', err?.message, JSON.stringify(err, null, 2));
    res.status(500).json({ error: 'Failed to send magic link', detail: err?.message || String(err) });
  }
});

// Magic link verification
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await upsertUser({ email });
    res.json({ token: makeJWT(user), user });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(400).json({ error: 'Invalid or expired link' });
  }
});

module.exports = router;
