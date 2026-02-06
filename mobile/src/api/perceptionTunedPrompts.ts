/**
 * Perception-Tuned Response Prompts
 *
 * This module provides prompt snippets that adapt the assistant's tone
 * based on the user's perception calibration selection.
 *
 * Perception states:
 * - feels_fine: User is comfortable → lighter tone, fewer cautions
 * - unsure: User is uncertain → balanced + one clarifying question
 * - feels_like_a_lot: User is overwhelmed → slower, more supportive
 */

import { PerceptionFeeling } from "../types/personContext";

// ============================================================================
// PERCEPTION-TUNED PROMPT SNIPPETS
// ============================================================================

/**
 * Get the prompt modifier based on perception state
 */
export function getPerceptionTonePrompt(perception: PerceptionFeeling | null): string {
  if (!perception) {
    // Default balanced tone
    return `TONE CALIBRATION: No perception recorded. Use a balanced, warm tone.`;
  }

  switch (perception) {
    case "feels_fine":
      return PERCEPTION_PROMPTS.feels_fine;
    case "unsure":
      return PERCEPTION_PROMPTS.unsure;
    case "feels_like_a_lot":
      return PERCEPTION_PROMPTS.feels_like_a_lot;
    default:
      return PERCEPTION_PROMPTS.default;
  }
}

/**
 * Individual perception prompt snippets
 */
export const PERCEPTION_PROMPTS = {
  feels_fine: `TONE CALIBRATION: User indicated this "feels fine" to them.

ADJUST YOUR RESPONSE:
- Keep it lighter and more conversational
- Fewer cautions or hedging—they are ready to move forward
- Still be honest and direct, but do not over-explain risks
- Trust their read of the situation
- Focus on actionable next steps rather than analysis
- One suggestion is usually enough

EXAMPLE PHRASES:
- "Makes sense. Here is one thing to try..."
- "Got it. Since you feel clear on this..."
- "Sounds like you have a handle on it. If you want..."

DO NOT:
- Add unnecessary warnings
- Repeat context they already know
- Over-qualify your suggestions`,

  unsure: `TONE CALIBRATION: User indicated they are "unsure" how this sits with them.

ADJUST YOUR RESPONSE:
- Stay balanced—neither dismissive nor alarmist
- Add ONE clarifying question to help them land somewhere
- Acknowledge the uncertainty without amplifying it
- Offer a small next step they can take to get more information
- Leave space for them to process

EXAMPLE PHRASES:
- "It makes sense you are not sure yet. One thing that might help clarify..."
- "That is fair—there is a lot to sit with here. What part feels most unclear?"
- "No need to decide anything yet. But if you wanted to..."

DO NOT:
- Push them toward a conclusion
- Add more complexity
- List multiple options (keep it simple)`,

  feels_like_a_lot: `TONE CALIBRATION: User indicated this "feels like a lot" to them.

ADJUST YOUR RESPONSE:
- Slow down—shorter sentences, more breathing room
- Be more supportive and grounding
- Acknowledge the weight without dramatizing it
- Do NOT pile on more information
- Focus on one small, manageable thing
- Remind them they do not have to figure it all out right now

EXAMPLE PHRASES:
- "That is a lot to hold. You do not have to sort it all out today."
- "I can see why this feels heavy. Let us take it one piece at a time."
- "No rush. What feels most important to you right now?"
- "You are doing fine by just noticing this. That is enough for now."

DO NOT:
- Add more context or analysis
- List multiple considerations
- Use urgent or heavy language
- Say anything that sounds like "you need to act"`,

  default: `TONE CALIBRATION: Use a balanced, warm tone. Be honest and direct but not clinical.`,
};

// ============================================================================
// FULL PROMPT INTEGRATION
// ============================================================================

/**
 * Build the complete system prompt with perception calibration
 */
export function buildPerceptionAwareSystemPrompt(
  baseSystemPrompt: string,
  perception: PerceptionFeeling | null
): string {
  const toneSnippet = getPerceptionTonePrompt(perception);

  return `${baseSystemPrompt}

---
${toneSnippet}
---`;
}

// ============================================================================
// EXAMPLE RESPONSES FOR EACH PERCEPTION STATE
// ============================================================================

export const PERCEPTION_RESPONSE_EXAMPLES = {
  /**
   * Same situation, three different perception states
   * Scenario: User shared that their partner canceled plans again
   */
  scenario: "Partner canceled plans again, third time this month",

  feels_fine: {
    perception: "feels_fine",
    userMessage: "Jordan canceled on me again. Work thing apparently. Whatever, I am used to it at this point.",
    response: `Makes sense you are not sweating it too much.

If you want to bring it up with Jordan at some point, something simple like "Hey, I noticed plans keep shifting—can we find a time that actually works?" could help without making it a big thing.

Or if it is not bothering you, it is fine to just let it be.`,
    notes: [
      "Short and direct",
      "One suggestion, not multiple",
      "No warnings or analysis",
      "Trusts their read",
    ],
  },

  unsure: {
    perception: "unsure",
    userMessage: "Jordan canceled on me again. Work thing apparently. I do not really know what to think anymore.",
    response: `It makes sense you are not sure what to make of it—this is the third time, and that would leave anyone wondering.

One thing that might help clarify: when you imagine bringing it up with Jordan, what is your gut reaction? Relief, dread, or something else?

That might tell you something about where you actually stand with this.`,
    notes: [
      "Acknowledges uncertainty without amplifying",
      "One clarifying question",
      "Helps them find their own answer",
      "No pressure to act",
    ],
  },

  feels_like_a_lot: {
    perception: "feels_like_a_lot",
    userMessage: "Jordan canceled on me again. Work thing apparently. I honestly do not know what I am doing anymore.",
    response: `That is a lot to sit with—especially when it keeps happening.

You do not have to figure out what it means right now. Sometimes the clearest thing you can do is just notice how it lands for you.

What feels most important to you in this moment? Not what you should do—just what matters to you.`,
    notes: [
      "Slower pace, shorter sentences",
      "No added analysis or context",
      "Grounding, not problem-solving",
      "Focuses on one thing",
      "Reminds them there is no rush",
    ],
  },
};

// ============================================================================
// ADDITIONAL EXAMPLE: WORKPLACE SCENARIO
// ============================================================================

export const PERCEPTION_RESPONSE_EXAMPLES_WORKPLACE = {
  scenario: "Manager keeps assigning work outside of role",

  feels_fine: {
    perception: "feels_fine",
    userMessage: "Marcus asked me to cover another project again. Kind of annoying but whatever.",
    response: `Yeah, that is annoying.

If you want to push back without making it a thing, something like "I can help with X, but I will need to deprioritize Y—which works better for you?" puts it back on him to choose.

Or if it is easier to just handle it this time, that is fine too.`,
  },

  unsure: {
    perception: "unsure",
    userMessage: "Marcus asked me to cover another project again. I do not know if I should push back or just do it.",
    response: `That is a fair question—there is a real trade-off either way.

One thing that might help: what would pushing back cost you versus what would saying yes cost you? Not in a dramatic way, just practically.

Once you see those two things side by side, it usually gets clearer.`,
  },

  feels_like_a_lot: {
    perception: "feels_like_a_lot",
    userMessage: "Marcus asked me to cover another project. I honestly feel like I cannot keep doing this.",
    response: `That makes sense. When it keeps piling up, it stops feeling like individual asks and starts feeling like the whole situation is too much.

You do not have to solve the whole thing right now. What is the one thing that would give you a little breathing room today?`,
  },
};

// ============================================================================
// UTILITY: Determine if perception calibration should be shown
// ============================================================================

/**
 * Conditions for showing perception calibration
 */
export function shouldShowPerceptionCalibration(context: {
  justShowedContextCard?: boolean;
  justSurfacedHeavyContext?: boolean;
  lastPerceptionRecordedAt?: string;
  currentMessageCount?: number;
}): boolean {
  const {
    justShowedContextCard,
    justSurfacedHeavyContext,
    lastPerceptionRecordedAt,
    currentMessageCount = 0,
  } = context;

  // Show after context card is displayed
  if (justShowedContextCard) return true;

  // Show after heavy context is surfaced
  if (justSurfacedHeavyContext) return true;

  // Do not show too frequently
  if (lastPerceptionRecordedAt) {
    const lastRecorded = new Date(lastPerceptionRecordedAt);
    const hoursSince = (Date.now() - lastRecorded.getTime()) / (1000 * 60 * 60);

    // Do not show if recorded in last 2 hours
    if (hoursSince < 2) return false;
  }

  // Show every ~10 messages if no recent calibration
  if (currentMessageCount > 0 && currentMessageCount % 10 === 0) {
    return true;
  }

  return false;
}

/**
 * Keywords that might indicate heavy context being surfaced
 */
export const HEAVY_CONTEXT_INDICATORS = [
  "keep in mind",
  "worth noticing",
  "taken together",
  "this connects to",
  "you mentioned before",
  "pattern",
  "keeps happening",
  "boundary",
  "past issues",
  "power imbalance",
];

/**
 * Check if assistant response contains heavy context
 */
export function containsHeavyContext(response: string): boolean {
  const lowercased = response.toLowerCase();
  return HEAVY_CONTEXT_INDICATORS.some((indicator) =>
    lowercased.includes(indicator.toLowerCase())
  );
}
