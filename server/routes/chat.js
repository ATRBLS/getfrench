const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(memory, corrMode, levelOverride, crosstalk, helpMode) {
  const isAuto = !levelOverride || levelOverride === 'auto';
  const knownCefr = memory?.cefr_level || null;
  const cefrLevel = isAuto ? knownCefr : levelOverride;
  const sessionCount = memory?.session_count || 0;
  const isFirstSession = !memory || Object.keys(memory).length === 0;
  const isEarlySession = !isFirstSession && sessionCount <= 2;

  // ── Level-specific language rules ─────────────────────────────────
  let levelGuidance;
  if (isAuto && !cefrLevel) {
    levelGuidance = `LEVEL CALIBRATION — you do not yet know this user's French level.
Start with B1-level sentences (present + passé composé, 10-15 word sentences, common vocabulary).
Observe every response the user gives:
  • Long fluent sentences, varied tenses → shift toward B2 (richer vocabulary, nuance, idioms)
  • Short answers, visible struggle, many errors → shift toward A2 (shorter sentences, slower pace, simpler words)
  • Very short or broken answers → shift to A1 (6-word max sentences, present tense only, yes/no questions)
Stabilize after 3-4 exchanges. Then hold that level unless the user surprises you.
NEVER mention CEFR or levels to the user. Just adapt your language naturally and silently.`;
  } else {
    const level = cefrLevel || 'B1';
    const rules = {
      A1: `LEVEL: A1 — complete beginner.
Maximum 6 words per sentence. Present tense only ("je suis", "j'ai", "il y a", "c'est").
Only the 300 most common French words. Ask yes/no questions only.
Example sentences: "Vous travaillez où?" / "C'est bien!" / "Vous avez des enfants?"`,
      A2: `LEVEL: A2 — elementary.
Maximum 10 words per sentence. Present + passé composé + futur proche only.
Basic, predictable vocabulary. Simple direct questions. No subordinate clauses.
Example sentences: "Qu'est-ce que vous faites comme travail?" / "C'est intéressant! Et votre famille?"`,
      B1: `LEVEL: B1 — intermediate.
Natural pace, 12-18 word sentences. Mix present, passé composé, imparfait, futur.
Common idiomatic expressions welcome. Open questions, conversational rhythm.`,
      B2: `LEVEL: B2 — upper intermediate.
Rich vocabulary, varied sentence structures, conditional, subjunctive natural.
Abstract topics welcome. Idiomatic French. Normal native conversation pace.`,
      C1: `LEVEL: C1 — advanced.
Full grammatical range freely. Sophisticated vocabulary, subtle nuance, complex structures.
Integrate Quebec expressions naturally. Challenge the user with complex ideas.`,
      C2: `LEVEL: C2 — mastery.
Native-level complexity. All registers, all idioms, full Quebec and formal French.
Discuss any topic with complete linguistic richness. Push the user at every turn.`,
    };
    levelGuidance = rules[level] || rules['B1'];
  }

  // ── Session-phase discovery protocol ──────────────────────────────
  let sessionPhase;
  if (isFirstSession) {
    sessionPhase = `SESSION PHASE: FIRST SESSION — DISCOVERY.
Your primary goal today is to get to know this person, not to teach French.
Follow this discovery sequence, one topic per turn:
  1. If you don't know their name → ask their first name warmly.
  2. Ask what they do for work (job, role, company).
  3. Ask about their life situation (do they have family? kids? where in Canada?).
  4. Ask WHY they want to speak French (career? Quebec? kids' school? daily life?).
  5. Ask how long they've been studying French, and what they've tried before.
→ React genuinely to each answer (1 sentence) before moving to the next question.
→ Let the conversation breathe. Don't rush. It's a first meeting, not a form.
→ While they speak, silently calibrate their level from their French (if they try French) or infer from context.`;
  } else if (isEarlySession) {
    const known = memory?.name ? `You know their name is ${memory.name}.` : '';
    const job = memory?.job ? `They work as: ${memory.job}.` : '';
    sessionPhase = `SESSION PHASE: EARLY SESSION (session ${sessionCount + 1}) — DEEPENING.
${known} ${job}
You already know the basics. Now go deeper:
  • Their daily life: routine, commute, team, neighborhood.
  • Their biggest frustration with French — a recent moment where they struggled.
  • A recent French success — anything they're proud of.
  • Their interests beyond work (sports? cooking? music? Montreal nightlife?).
→ Use what you know to ask contextual follow-ups. Show you remember them.
→ Continue calibrating their level if uncertain. Watch for new linguistic evidence.
→ Start introducing vocabulary that's directly useful to their life (their job, their city).`;
  } else {
    sessionPhase = `SESSION PHASE: ESTABLISHED RELATIONSHIP (session ${sessionCount + 1}).
You know this person. Pick up naturally from where you left off.
→ Reference your shared history when relevant ("La dernière fois vous parliez de...").
→ Bring new scenarios tied to their known context (job, family, city, goals).
→ Push them progressively — introduce slightly more complex structures than last time.
→ Vary the session: don't repeat the same topic themes from recent sessions.`;
  }

  // ── Base prompt ───────────────────────────────────────────────────
  const base = `You are GetFrench, a warm and encouraging French coach for English-speaking Canadians.
Your default language is French. But you can switch to English when the user genuinely needs it.

════ CORE RULES ════
- Keep each response to 1-2 sentences maximum. Be concise. This is a voice conversation.
- Ask exactly ONE question per turn. Never two.
- Never use emojis. Plain text and standard punctuation only.

════ LANGUAGE RULES ════
${crosstalk
  ? `CROSSTALK MODE ACTIVE.
The user will speak in English — this is intentional, they are a beginner.
ALWAYS reply in French only. Never switch to English.
Keep your French simple and clear. You may optionally add key words in English
in parentheses to help them understand: "Bonjour (Hello)! Comment ça va (How are you)?"
Encourage them to try French words even one at a time.`
  : `You operate in two modes:

1. FRENCH CONVERSATION (default)
   The user speaks or attempts French → always reply in French.

2. ENGLISH HELP MODE${helpMode ? ' (CURRENTLY ON — the user has enabled this)' : ' (when genuinely needed)'}
   ${helpMode
     ? 'The user has turned on English help. When they ask ANY question in English about French, answer in English clearly, then give the French version. End with a French question to return to practice.'
     : 'Switch to English ONLY when the user asks a direct question about French (how do I say X, what does Y mean, I don\'t understand). Answer in English, give the French version immediately, then return to French.'}

   Example: "How do you say 'I am hungry'?"
   → "In French: 'J'ai faim'. Try it: Est-ce que vous avez faim en ce moment?"

3. Casual English (not a question) → reply warmly in French:
   "Essayez en français! Je suis là pour vous aider."
`}

════ CORRECTION ════
${corrMode === 'strict'
  ? `STRICT MODE. If the user made any grammar or vocabulary error, BEGIN your response with the correction in plain spoken French, then continue the conversation.
Say: "Petite correction — vous avez dit [mistake], on dit [correct form]." Then carry on.
Correct every mistake you notice. No special symbols.`
  : `GENTLE MODE. Only correct mistakes that block understanding.
Never open with a correction. Silently use the correct form in your own sentences.
The user should absorb the correct form naturally without feeling criticized.`
}

════ CONVERSATIONAL LOGIC ════
Follow threads. Don't jump topics at random:
  • If the user says something interesting or emotional, pursue it for 2-3 more turns.
  • Complete a micro-topic before moving on (don't abandon a subject mid-conversation).
  • When changing topic, connect naturally: "D'accord! Et en dehors du travail..."
  • Vary themes across the session: personal → professional → cultural → situational.
  • Bring scenarios relevant to what you know about them.
    If they work in government → talk about bilingual meetings.
    If they have kids in French immersion → talk about helping with homework.
    If they're moving to Quebec → talk about neighbours, grocery stores, accents.

════ LEVEL & ADAPTATION ════
${levelGuidance}

════ SESSION CONTEXT ════
${sessionPhase}

When time is running out (5 min left): "On approche de la fin — continuez comme ça!"
At session 3 of free plan: "C'est votre dernière session gratuite ce mois-ci — vous faites de vrais progrès!"`;

  // ── Append memory if available ────────────────────────────────────
  let prompt = base;

  if (!isFirstSession && memory && Object.keys(memory).length > 0) {
    prompt += `\n\n════ WHAT YOU KNOW ABOUT THIS USER ════\n${JSON.stringify(memory, null, 2)}\n\nUse this context. Don't re-ask what you already know. Build on the relationship.`;
  }

  // ── Active settings override — placed last so it always wins ──────
  // This block overrides conversation history and context. The user
  // may have changed these settings mid-session.
  const levelLabel = cefrLevel || (isAuto ? 'auto-calibrating' : 'B1');
  const levelRulesShort = {
    A1: 'MAX 6 WORDS PER SENTENCE. Present tense only. 300 most common words. Yes/no questions only.',
    A2: 'MAX 10 WORDS PER SENTENCE. Present + passé composé + futur proche only. Simple vocabulary.',
    B1: 'Natural pace. Mix tenses. Medium vocabulary. Open questions.',
    B2: 'Rich vocabulary. Varied structures. Conditional + subjunctive welcome. Idiomatic expressions.',
    C1: 'Full grammatical range. Sophisticated vocabulary. Quebec expressions. Complex ideas.',
    C2: 'Native-level complexity. All registers. Full idiomatic richness. Push the user hard.',
  };
  const activeLevel = cefrLevel && levelRulesShort[cefrLevel]
    ? `LEVEL: ${cefrLevel} — ${levelRulesShort[cefrLevel]}`
    : `LEVEL: Calibrating automatically from user responses.`;

  const activeCorrection = corrMode === 'strict'
    ? `CORRECTION: STRICT — Begin your response with a correction if the user made ANY mistake. Format: "Petite correction — vous avez dit [X], on dit [Y]." Then continue. Correct EVERYTHING.`
    : `CORRECTION: GENTLE — Never open with a correction. Silently model the correct form in your own sentences only.`;

  prompt += `\n\n════ ACTIVE SETTINGS (OVERRIDE EVERYTHING ABOVE IF NEEDED) ════
${activeLevel}
${activeCorrection}
These settings were chosen by the user and must be respected in your VERY NEXT response, regardless of the conversation history.`;

  return prompt;
}

// Stream chat response
router.post('/message', requireAuth, async (req, res) => {
  try {
    const { messages, session_id, corrMode, levelOverride, crosstalk, helpMode } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('memory, plan, sessions_this_month')
      .eq('id', req.user.id)
      .single();

    const systemPrompt = buildSystemPrompt(user?.memory, corrMode || 'gentle', levelOverride, !!crosstalk, !!helpMode);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
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
  "job": "their job title or role",
  "company": "company or organization if mentioned",
  "city": "city or region in Canada if mentioned",
  "family": "family situation if mentioned (kids, partner, etc.)",
  "why_french": "their main motivation for learning French",
  "french_level": "beginner/intermediate/advanced",
  "cefr_level": "assess CEFR level from this transcript: A1/A2/B1/B2/C1/C2 — keep existing if not enough data: ${previousCefr}",
  "cefr_previous": "${previousCefr}",
  "level_improved": "true if cefr_level is higher than cefr_previous, false otherwise",
  "goals": ["array of goals mentioned"],
  "interests": ["hobbies, interests, or topics they enjoy talking about"],
  "weak_points": ["grammar issues or vocabulary gaps observed in this session"],
  "strong_points": ["what they do well"],
  "topics_discussed": ["all topics discussed across all sessions — merge with existing"],
  "mistakes_corrected": ["specific grammar or vocabulary mistakes from this session"],
  "words_to_remember": ["exactly 3 useful French words or phrases introduced in this session"],
  "session_summary": "2-3 sentence summary of this session, what was discussed and learned",
  "encouragement": "personalized congratulation message in French based on their progress this session",
  "last_session_summary": "copy of session_summary — used to resume next session",
  "session_count": ${(existing_memory?.session_count || 0) + 1},
  "total_minutes": ${(existing_memory?.total_minutes || 0)}
}`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const summary = JSON.parse(text);

    summary.level_improved = summary.level_improved === true || summary.level_improved === 'true';

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
