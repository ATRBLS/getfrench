const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get current user data (plan, usage, memory)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, plan, sessions_this_month, seconds_used, reset_date, memory, streak_count, last_session_date')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    // Auto-reset counters if past reset date
    const now = new Date();
    const resetDate = new Date(user.reset_date);
    if (now >= resetDate) {
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      await supabase
        .from('users')
        .update({ sessions_this_month: 0, seconds_used: 0, reset_date: nextReset })
        .eq('id', user.id);
      user.sessions_this_month = 0;
      user.seconds_used = 0;
      user.reset_date = nextReset;
    }

    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start a new session
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('plan, sessions_this_month, seconds_used, reset_date')
      .eq('id', req.user.id)
      .single();

    // Check limits
    const now = new Date();
    const resetDate = new Date(user.reset_date);
    let sessions = user.sessions_this_month;
    let seconds = user.seconds_used;

    if (now >= resetDate) {
      sessions = 0;
      seconds = 0;
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      await supabase
        .from('users')
        .update({ sessions_this_month: 0, seconds_used: 0, reset_date: nextReset })
        .eq('id', user.id);
    }

    if (user.plan === 'free' && sessions >= 3) {
      return res.status(403).json({ error: 'limit_reached', message: 'Free plan limit reached' });
    }

    if (user.plan !== 'free' && user.plan !== 'unlimited' && seconds <= 0 && user.plan !== null) {
      const limits = { starter: 14400, pro: 36000 };
      const limit = limits[user.plan] || 0;
      if (limit > 0 && seconds >= limit) {
        return res.status(403).json({ error: 'limit_reached', message: 'Monthly time limit reached' });
      }
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ user_id: req.user.id, started_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    // Increment session counter
    await supabase
      .from('users')
      .update({ sessions_this_month: sessions + 1 })
      .eq('id', req.user.id);

    res.json({ session_id: session.id });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// End a session — saves duration and memory summary
router.post('/end', requireAuth, async (req, res) => {
  try {
    const { session_id, duration_seconds, summary } = req.body;

    await supabase
      .from('sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds,
        summary,
      })
      .eq('id', session_id)
      .eq('user_id', req.user.id);

    // Update total seconds, save memory, and calculate streak
    const { data: user } = await supabase
      .from('users')
      .select('seconds_used, streak_count, last_session_date')
      .eq('id', req.user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const last = user?.last_session_date;
    let newStreak = 1;
    if (last === today) {
      newStreak = user.streak_count || 1;        // already practiced today
    } else if (last === yesterdayStr) {
      newStreak = (user.streak_count || 0) + 1;  // consecutive day
    }
    // else: missed a day — reset to 1

    const updates = {
      seconds_used: (user.seconds_used || 0) + duration_seconds,
      streak_count: newStreak,
      last_session_date: today,
    };
    if (summary) updates.memory = summary;

    await supabase.from('users').update(updates).eq('id', req.user.id);

    res.json({ ok: true, streak_count: newStreak });
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
