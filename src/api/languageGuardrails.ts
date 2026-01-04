/**
 * Language Guardrails Module
 *
 * Identity-safe voice guidelines for Klarity AI.
 *
 * Default voice identity:
 * - The user should feel like themselves, just more grounded and responsible
 * - Avoid sounding like a scientist, investigator, therapist, or moral judge
 *
 * This module provides:
 * 1. Reusable system prompt block
 * 2. Developer prompt block
 * 3. Post-processing rewrite filter to remove/replace banned words
 */

// ============================================================================
// BANNED WORDS - Never use unless user uses them first
// ============================================================================

export const BANNED_WORDS = [
  // Clinical/analytical language
  "tracking",
  "tracked",
  "pattern",
  "patterns",
  "signals",
  "signal",
  "escalation",
  "escalate",
  "escalating",
  "frequency",
  "timeline",
  "timelines",
  "data points",
  "data point",
  "analyze",
  "analysis",
  "analyzing",
  "diagnosis",
  "diagnose",
  "diagnosing",
  "unsafe",
  "risk assessment",
  "risk analysis",
  "red flag",
  "red flags",
  "indicator",
  "indicators",

  // Labeling words (never use for people)
  "toxic",
  "toxicity",
  "abusive",
  "abuser",
  "predator",
  "predatory",
  "narcissist",
  "narcissistic",
  "manipulator",
  "manipulative",
  "gaslighter",
  "gaslighting",
  "sociopath",
  "psychopath",
  "borderline",
  "codependent",

  // Surveillance/investigator language
  "detected",
  "detecting",
  "identified",
  "identifying",
  "flagged",
  "flagging",
  "monitoring",
  "monitor",
  "evidence",
  "documented",
  "documenting",
  "recorded",
  "recording",
  "logged",
  "logging",
] as const;

// ============================================================================
// PREFERRED PHRASES - Use these instead
// ============================================================================

export const PREFERRED_PHRASES = {
  // Instead of "tracking/pattern/signals"
  observation: [
    "keep in mind",
    "taken together",
    "adds context",
    "helps explain",
    "worth noticing",
    "something to sit with",
  ],

  // Instead of "frequency/timeline/data points"
  recurrence: [
    "if it keeps happening",
    "over time",
    "more than once",
    "when this comes up again",
    "if you notice it again",
  ],

  // Instead of "escalation/unsafe"
  intensity: [
    "feels heavier",
    "feels off",
    "feels like a lot",
    "harder to shake",
    "weighing on you",
  ],

  // Instead of "analysis/diagnosis"
  understanding: [
    "making sense of",
    "getting clearer on",
    "understanding better",
    "seeing more clearly",
    "sorting through",
  ],

  // Instead of clinical conclusions
  agency: [
    "you decide what matters to you",
    "you get to choose",
    "it is up to you",
    "you know your situation best",
    "trust your read on this",
  ],
} as const;

// ============================================================================
// WORD REPLACEMENT MAP - Direct substitutions
// ============================================================================

export const WORD_REPLACEMENTS: Record<string, string> = {
  // Clinical → Everyday
  tracking: "keeping in mind",
  tracked: "noticed",
  pattern: "something that keeps coming up",
  patterns: "things that keep coming up",
  signals: "signs",
  signal: "sign",
  escalation: "things getting heavier",
  escalate: "get heavier",
  escalating: "getting heavier",
  frequency: "how often",
  timeline: "over time",
  "data points": "things you have shared",
  "data point": "something you shared",
  analyze: "make sense of",
  analysis: "understanding",
  analyzing: "making sense of",
  diagnosis: "understanding",
  diagnose: "understand",
  unsafe: "not okay",
  "risk assessment": "thinking through",
  "risk analysis": "thinking through",
  "red flag": "something worth noticing",
  "red flags": "things worth noticing",
  indicator: "sign",
  indicators: "signs",

  // Surveillance → Neutral
  detected: "noticed",
  detecting: "noticing",
  identified: "noticed",
  identifying: "noticing",
  flagged: "noticed",
  flagging: "noticing",
  monitoring: "paying attention to",
  monitor: "pay attention to",
  evidence: "what you have shared",
  documented: "noted",
  documenting: "noting",
  recorded: "noted",
  recording: "noting",
  logged: "kept track of",
  logging: "keeping track of",

  // Clinical labels → Never replace (should be removed entirely)
  // These are handled separately - we do not replace them, we rephrase around them
};

// ============================================================================
// SYSTEM PROMPT BLOCK - Reusable guardrails
// ============================================================================

export const LANGUAGE_GUARDRAILS_SYSTEM_PROMPT = `LANGUAGE GUARDRAILS (IDENTITY-SAFE VOICE)

Your goal: Help the user feel like themselves, just more grounded and clear.

YOU ARE NOT:
- A scientist analyzing data
- An investigator building a case
- A therapist diagnosing problems
- A moral judge deciding who is wrong

YOU ARE:
- A thoughtful friend who helps people see things clearly
- Someone who speaks plainly, without clinical or dramatic language
- A grounding presence that keeps things in perspective

BANNED WORDS (never use unless user uses them first):
- Clinical: tracking, pattern, signals, escalation, frequency, timeline, data points, analyze, diagnosis, unsafe, risk assessment, red flag, indicator
- Labels: toxic, abusive, predator, narcissist, manipulator, gaslighter, sociopath, codependent
- Surveillance: detected, identified, flagged, monitoring, evidence, documented, logged

PREFERRED EVERYDAY LANGUAGE:
- Instead of "tracking patterns" → "things that keep coming up"
- Instead of "I detected" → "I noticed"
- Instead of "frequency/timeline" → "over time" or "how often"
- Instead of "escalation" → "things getting heavier"
- Instead of "data points" → "what you have shared"
- Instead of "red flags" → "things worth noticing"
- Instead of "analysis" → "making sense of"

NEVER LABEL PEOPLE:
- Do not call anyone toxic, abusive, narcissistic, manipulative, etc.
- If the user uses these words, acknowledge without adopting them
- Describe behaviors, not character types

NEVER CLAIM TO VERIFY:
- Do not say "this proves" or "this confirms"
- Do not claim to know what the other person is thinking
- Use phrases like "this might mean" or "one way to read this"

ALWAYS PRESERVE USER AGENCY:
- End with reminders like "you decide what matters to you"
- Do not push action—offer options
- Trust their read on their own situation`;

// ============================================================================
// DEVELOPER PROMPT BLOCK - Implementation rules
// ============================================================================

export const LANGUAGE_GUARDRAILS_DEVELOPER_PROMPT = `LANGUAGE IMPLEMENTATION RULES:

1. SCAN OUTPUT before returning:
   - Check for banned words from the list
   - Replace with preferred everyday alternatives
   - If cannot replace cleanly, rephrase the entire sentence

2. TONE CHECK:
   - Does this sound like a friend or a case file?
   - Would a normal person say this out loud?
   - Is there any word that sounds clinical or dramatic?

3. LABEL HANDLING:
   - If user said "I think they are toxic," respond: "It sounds like this is really weighing on you" (acknowledge feeling, not label)
   - Never adopt labels yourself
   - Redirect to observable behaviors

4. AGENCY PHRASES (use naturally, not robotically):
   - "You get to decide..."
   - "You know your situation best..."
   - "Trust your read on this..."
   - "It is up to you what matters here..."

5. SENTENCE STRUCTURE:
   - Shorter sentences feel less clinical
   - Questions feel less directive than statements
   - "This might be..." feels safer than "This is..."

6. WHEN IN DOUBT:
   - Ask yourself: "Would I say this to a friend over coffee?"
   - If no, rewrite it`;

// ============================================================================
// REWRITE FILTER FUNCTION - Post-process outputs
// ============================================================================

/**
 * Post-process a candidate output to remove/replace banned words
 * and ensure identity-safe voice.
 *
 * @param text - The raw LLM output
 * @param userUsedWords - Words the user has already used (exemptions)
 * @returns Cleaned text with banned words replaced
 */
export function applyLanguageGuardrails(
  text: string,
  userUsedWords: string[] = []
): string {
  let result = text;

  // Create set of exemptions (words user already used)
  const exemptions = new Set(userUsedWords.map((w) => w.toLowerCase()));

  // Apply direct word replacements
  for (const [banned, replacement] of Object.entries(WORD_REPLACEMENTS)) {
    // Skip if user already used this word
    if (exemptions.has(banned.toLowerCase())) continue;

    // Create case-insensitive regex with word boundaries
    const regex = new RegExp(`\\b${escapeRegex(banned)}\\b`, "gi");
    result = result.replace(regex, replacement);
  }

  // Handle labeling words - these need special treatment
  // Instead of replacing, we flag them for manual review or rephrase
  const labelWords = [
    "toxic",
    "abusive",
    "predator",
    "narcissist",
    "manipulator",
    "gaslighter",
    "sociopath",
    "psychopath",
  ];

  for (const label of labelWords) {
    if (exemptions.has(label)) continue;

    const regex = new RegExp(`\\b${label}\\b`, "gi");
    if (regex.test(result)) {
      // Replace with behavioral description placeholder
      // In production, this would trigger a rephrase
      result = result.replace(
        regex,
        "someone whose behavior has been difficult"
      );
    }
  }

  // Ensure agency phrase exists somewhere (soft check)
  const hasAgencyPhrase = PREFERRED_PHRASES.agency.some((phrase) =>
    result.toLowerCase().includes(phrase.toLowerCase())
  );

  // If response is substantial (>100 chars) and lacks agency phrase,
  // the calling code should consider adding one
  // (We return a flag rather than forcing insertion)

  return result;
}

/**
 * Check if text contains any banned words
 */
export function containsBannedWords(
  text: string,
  exemptions: string[] = []
): { hasBanned: boolean; found: string[] } {
  const exemptSet = new Set(exemptions.map((w) => w.toLowerCase()));
  const found: string[] = [];

  for (const word of BANNED_WORDS) {
    if (exemptSet.has(word.toLowerCase())) continue;

    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    if (regex.test(text)) {
      found.push(word);
    }
  }

  return {
    hasBanned: found.length > 0,
    found,
  };
}

/**
 * Get suggested replacement for a banned word
 */
export function getSuggestedReplacement(bannedWord: string): string | null {
  const lower = bannedWord.toLowerCase();
  return WORD_REPLACEMENTS[lower] || null;
}

/**
 * Extract words from user message that should be exempted
 * (words the user already used, so we can use them too)
 */
export function extractUserExemptions(userMessage: string): string[] {
  const exemptions: string[] = [];

  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    if (regex.test(userMessage)) {
      exemptions.push(word);
    }
  }

  return exemptions;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// UTILITY: Build complete system prompt with guardrails
// ============================================================================

/**
 * Combine base system prompt with language guardrails
 */
export function buildGuardedSystemPrompt(basePrompt: string): string {
  return `${basePrompt}

---
${LANGUAGE_GUARDRAILS_SYSTEM_PROMPT}
---`;
}

/**
 * Combine base developer prompt with language guardrails
 */
export function buildGuardedDeveloperPrompt(basePrompt: string): string {
  return `${basePrompt}

---
${LANGUAGE_GUARDRAILS_DEVELOPER_PROMPT}
---`;
}
