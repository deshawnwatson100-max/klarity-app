/**
 * Person Context Card Generation Prompts
 *
 * These prompts are used to generate a "Person Context Card" from user inputs.
 * The card helps Klarity respond with more clarity and empathy.
 */

// ============================================================================
// SYSTEM PROMPT - Sets the role and constraints for the LLM
// ============================================================================

export const PERSON_CONTEXT_CARD_SYSTEM_PROMPT = `You are a thoughtful assistant helping someone organize their thoughts about a person in their life. Your job is to create a "Person Context Card" that helps the user see things more clearly.

CORE PRINCIPLES:
- You are NOT a therapist, coach, or advisor. You are a clarity tool.
- Never label or diagnose the person being described.
- Never use clinical language unless the user explicitly used it first.
- Be honest and direct, but calm and grounded.
- Treat all context as "things to consider," not verdicts or conclusions.
- The user decides what matters—you just help them see clearly.

LANGUAGE RULES:
- NEVER use: "tracking," "pattern," "signals," "risk analysis," "escalation," "frequency," "timeline," "data points," "red flag," "toxic," "narcissist," "gaslighting" (unless user explicitly used these terms)
- PREFER: "keep in mind," "taken together," "this adds context," "this helps explain," "if it keeps happening," "over time," "worth noticing"
- Keep bullets SHORT (10 words or less when possible)
- Write like a thoughtful friend, not a case file

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure. No markdown, no explanation, just JSON.`;

// ============================================================================
// DEVELOPER PROMPT - Additional instructions for consistent output
// ============================================================================

export const PERSON_CONTEXT_CARD_DEVELOPER_PROMPT = `STRICT OUTPUT REQUIREMENTS:
1. Return ONLY the JSON object - no markdown code blocks, no explanations
2. All arrays must have 3-6 items
3. Each bullet/question must be under 15 words
4. knownContext = factual things the user shared
5. thingsToKeepInMind = observations that might be useful
6. helpfulQuestions = gentle questions the user might ask themselves
7. If user mentioned concerning behavior, frame it as "context to consider" not "warning signs"
8. If user mentioned past issues (legal/professional), acknowledge without dramatizing
9. Match the emotional temperature of the user's input - don't catastrophize or minimize`;

// ============================================================================
// USER PROMPT TEMPLATE - Filled with actual user inputs
// ============================================================================

export function buildPersonContextCardUserPrompt(inputs: {
  name: string;
  relationshipContext: string;
  userGoal?: string;
  selectedChips?: string[];
  freeTextNotes?: string;
  personId: string;
}): string {
  const { name, relationshipContext, userGoal, selectedChips, freeTextNotes, personId } = inputs;

  const chipsList = selectedChips?.length ? selectedChips.join(", ") : "None selected";
  const goalText = userGoal || "Not specified";
  const notesText = freeTextNotes?.trim() || "None provided";

  return `Create a Person Context Card for the following:

NAME: ${name}
RELATIONSHIP: ${relationshipContext}
USER'S GOAL: ${goalText}
CONTEXT FLAGS: ${chipsList}
ADDITIONAL NOTES: ${notesText}

Return this exact JSON structure (fill in the brackets with your generated content):

{
  "personId": "${personId}",
  "title": "Context card for ${name}",
  "knownContext": [
    "First factual thing user shared",
    "Second factual thing",
    "Third factual thing"
  ],
  "thingsToKeepInMind": [
    "First observation that might be useful",
    "Second observation",
    "Third observation"
  ],
  "helpfulQuestions": [
    "First gentle question user might ask themselves?",
    "Second question?",
    "Third question?"
  ],
  "toneNotes": {
    "defaultTone": "warm_grounded",
    "avoidWords": ["tracking", "pattern", "signals", "risk analysis", "escalation", "frequency", "timeline", "data points"],
    "preferredPhrases": ["keep in mind", "taken together", "this adds context", "this helps explain", "if it keeps happening", "over time"]
  },
  "safety": {
    "noLabeling": true,
    "noDiagnosis": true,
    "noExternalVerificationClaims": true,
    "agencyLine": "You decide what matters to you—this just helps you see things clearly."
  }
}`;
}

// ============================================================================
// TYPESCRIPT INTERFACE FOR THE OUTPUT
// ============================================================================

export interface PersonContextCard {
  personId: string;
  title: string;
  knownContext: string[];
  thingsToKeepInMind: string[];
  helpfulQuestions: string[];
  toneNotes: {
    defaultTone: "warm_grounded" | "supportive" | "direct";
    avoidWords: string[];
    preferredPhrases: string[];
  };
  safety: {
    noLabeling: boolean;
    noDiagnosis: boolean;
    noExternalVerificationClaims: boolean;
    agencyLine: string;
  };
}

// ============================================================================
// HELPER TO PARSE AND VALIDATE THE RESPONSE
// ============================================================================

export function parsePersonContextCardResponse(response: string): PersonContextCard | null {
  try {
    // Try to extract JSON from the response (in case LLM adds markdown)
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }

    const parsed = JSON.parse(jsonStr.trim());

    // Basic validation
    if (
      typeof parsed.personId !== "string" ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.knownContext) ||
      !Array.isArray(parsed.thingsToKeepInMind) ||
      !Array.isArray(parsed.helpfulQuestions)
    ) {
      console.error("Invalid PersonContextCard structure");
      return null;
    }

    return parsed as PersonContextCard;
  } catch (error) {
    console.error("Failed to parse PersonContextCard response:", error);
    return null;
  }
}
