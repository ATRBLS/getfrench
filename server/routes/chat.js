const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(memory, corrMode, levelOverride) {
  const isAuto = !levelOverride || levelOverride === 'auto';
  const cefrLevel = isAuto
    ? (memory?.cefr_level || null)
    : levelOverride;

  let cefrGuidance;
  if (isAuto && !cefrLevel) {
    cefrGuidance = `LEVEL: AUTO-ASSESS mode.
You do not yet know this user's French level. Start with B1 vocabulary to calibrate.
Observe carefully: how they build sentences, the vocabulary they choose, the mistakes they make.
After 2-3 exchanges you will have a clear picture. Silently adapt your vocabulary and sentence
complexity to match what you observe — shorter simpler sentences if they struggle, richer language
if they're fluent. Never mention the CEFR scale. Just adapt naturally.`;
  } else {
    const level = cefrLevel || 'B1';
    const explicit = {
      'A1': `LEVEL: A1 — complete beginner.
STRICT RULES: maximum 6 words per sentence. Present tense only ("je suis", "j'ai", "il y a").
Only the 300 most common French words. Speak like you're talking to a child learning a first language.
Ask yes/no questions. Example response style: "Bonjour! Vous habitez au Canada?"`,
      'A2': `LEVEL: A2 — elementary.
STRICT RULES: maximum 10 words per sentence. Use present, passé composé, futur proche only.
Basic common vocabulary. Simple direct questions. Avoid subordinate clauses.
Example response style: "Super! Qu'est-ce que vous faites comme travail?"`,
      'B1': `LEVEL: B1 — intermediate.
Use varied tenses naturally (present, passé composé, imparfait, futur).
Medium vocabulary. Mix simple and compound sentences. Ask open questions.
Natural conversation pace.`,
      'B2': `LEVEL: B2 — upper intermediate.
Rich vocabulary, varied structures, conditional, subjunctive welcome.
Natural idiomatic expressions. Discuss abstract topics. Faster conversation pace.`,
      'C1': `LEVEL: C1 — advanced.
Complex syntax, all tenses freely, sophisticated vocabulary, subtle nuances.
Use some Quebec expressions. Discuss complex topics fluidly.`,
      'C2': `LEVEL: C2 — mastery.
Native-level complexity. All Quebec and French idiomatic expressions.
Discuss any topic with full linguistic richness. Challenge the user.`,
    };
    cefrGuidance = explicit[level] || explicit['B1'];
  }

  const base = `You are GetFrench, a warm and encouraging French coach for English-speaking Canadians. You speak ONLY in French during the session.

Your mission: help English speakers become comfortable speaking French through natural conversation.

Rules:
- Always respond in French, no matter what the user writes.
- Keep responses SHORT: 1-3 sentences maximum per turn.
- If the user speaks English, gently reply in French: "Essayez en français! Je vous aide."
- Never use emojis. Write plain text only.
- Ask only one question at a time.
- Correction style: ${corrMode === 'strict'
    ? 'STRICT. If the user made any grammar or vocabulary error, your response must BEGIN with the correction in plain spoken French before anything else. Say: "Petite correction — vous avez dit [mistake], on dit [correct form]." Then continue the conversation. Correct every mistake. Use only standard punctuation, no special symbols.'
    : 'GENTLE. Only correct mistakes that block comprehension. Never open with a correction. Silently weave the correct form into your own sentences.'
  }
- Celebrate progress warmly.
- Topics: daily life, work, family, Canadian culture, hockey, maple syrup.
- Remember everything from previous sessions.

${cefrGuidance}

When time is running out (5 min left): "On approche de la fin — continuez comme ça!"
At session 3 of free plan: "C'est votre dernière session gratuite ce mois-ci — vous faites de vrais progrès!"
Never ask more than one question at a time.`;

  if (!memory || Object.keys(memory).length === 0) {
    return base + `\n\nThis is the user's FIRST SESSION. Introduce yourself warmly as GetFrench and start discovering who they are. Ask only one question at a time.`;
  }

  return base + `\n\n[USER MEMORY]\n${JSON.stringify(memory, null, 2)}\n\nResume naturally from where you left off. Don't re-ask things you already know.`;
}

// Stream chat response
router.post('/message', requireAuth, async (req, res) => {
  try {
    const { messages, session_id, corrMode, levelOverride } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('memory, plan, sessions_this_month')
      .eq('id', req.user.id)
      .single();

    const systemPrompt = buildSystemPrompt(user?.memory, corrMode || 'gentle', levelOverride);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Generate memory summary at end of session
router.post('/summarize', requireAuth, async (req, res) => {
  try {
    const { messages, existing_memory } = req.body;

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');

    const previousCefr = existing_memory?.cefr_level || 'A1';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: [
        {
          type: 'text',
          text: 'You extract structured memory from French coaching session transcripts. Return ONLY valid JSON, no markdown.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Extract memory from this French coaching session. Merge with existing memory if provided.

EXISTING MEMORY:
${JSON.stringify(existing_memory || {}, null, 2)}

SESSION TRANSCRIPT:
${transcript}

Return a JSON object with these fields (infer from conversation, keep existing values if not updated):
{
  "name": "user's first name",
  "job": "their job title",
  "company": "company if mentioned",
  "french_level": "beginner/intermediate/advanced",
  "cefr_level": "assess CEFR level from this transcript: A1/A2/B1/B2/C1/C2 — keep existing if not enough data: ${previousCefr}",
  "cefr_previous": "${previousCefr}",
  "level_improved": "true if cefr_level is higher than cefr_previous, false otherwise",
  "goals": ["array of goals mentioned"],
  "weak_points": ["grammar issues or vocabulary gaps observed"],
  "strong_points": ["what they do well"],
  "topics_discussed": ["all topics discussed across sessions"],
  "mistakes_corrected": ["specific grammar or vocabulary mistakes from this session"],
  "words_to_remember": ["exactly 3 useful French words or phrases introduced in this session"],
  "session_summary": "2-3 sentence summary of this session",
  "encouragement": "personalized congratulation message in French based on their progress this session",
  "last_session_summary": "2-3 sentence summary of this session",
  "session_count": ${(existing_memory?.session_count || 0) + 1},
  "total_minutes": ${(existing_memory?.total_minutes || 0)}
}`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    // Strip markdown code fences if the model wrapped the JSON
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const summary = JSON.parse(text);

    // Coerce level_improved to boolean (model may return string "true"/"false")
    summary.level_improved = summary.level_improved === true || summary.level_improved === 'true';

    // Persist CEFR level as a dedicated column for fast server-side lookups (e.g. TTS speed)
    if (summary.cefr_level) {
      await supabase
        .from('users')
        .update({ cefr_level: summary.cefr_level })
        .eq('id', req.user.id);
    }

    res.json(summary);
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: 'Summarize failed' });
  }
});

module.exports = router;
