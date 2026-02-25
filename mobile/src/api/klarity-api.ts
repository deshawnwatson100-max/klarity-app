import { EmotionalAnalysis, SuggestedResponse, ImageAnalysis, BoundaryAnalysis } from "../types/chat";
import { getOpenAIClient } from "./openai";
import { processDecodeResponseWithEmoji } from "../utils/decodeEmoji";

/**
 * Clean suggested reply text by removing uncommon texting patterns
 * that the AI sometimes generates but sound unnatural
 */
function cleanReplyText(text: string): string {
  let cleaned = text;

  // Remove em-dashes, en-dashes, and hyphens used as punctuation between words
  // These are common in formal writing but uncommon in casual texting
  // Examples: "though — it seems" → "though it seems"
  //           "I think - maybe" → "I think maybe"
  cleaned = cleaned.replace(/\s*[—–-]\s*/g, " ");

  // Clean up any resulting double spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

/**
 * Strip all markdown formatting from AI-generated text.
 * Removes bold (**text** / __text__), italic (*text* / _text_),
 * underscores used as emphasis, headers (#), and stray backticks.
 */
function stripMarkdown(text: string): string {
  let t = text;
  // Bold: **text** or __text__
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/__(.+?)__/g, "$1");
  // Italic: *text* or _text_
  t = t.replace(/\*(.+?)\*/g, "$1");
  t = t.replace(/_(.+?)_/g, "$1");
  // Lone underscores not part of a word (e.g. used as separator)
  t = t.replace(/(?<!\w)_(?!\w)/g, "");
  // Markdown headers
  t = t.replace(/^#{1,6}\s+/gm, "");
  // Inline code backticks
  t = t.replace(/`(.+?)`/g, "$1");
  // Clean up extra whitespace
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/**
 * Klarity Notation types for internal tracking
 * Used across all chat loops (decode, reply, clarification)
 */
export interface KlarityNotation {
  mode: "decode" | "reply" | "clarification";
  confidence: "low" | "medium" | "high";
  signal_types: Array<"interest" | "boundary" | "hesitation" | "alignment" | "power" | "neutral" | "unclear">;
  advice_level: "none" | "exploratory" | "directive";
  assumptions_made: "yes" | "no";
  clarification_needed: "yes" | "no";
  loop_integrity: "pass" | "warn";
}

/**
 * Parse Klarity notation block from response
 * Returns the user-facing response and the internal notation
 */
function parseKlarityNotation(fullResponse: string): {
  userResponse: string;
  notation: KlarityNotation | null;
} {
  const notationMatch = fullResponse.match(/\[\[KLARITY_NOTES\]\]([\s\S]*?)\[\[\/KLARITY_NOTES\]\]/);

  if (!notationMatch) {
    return { userResponse: stripMarkdown(fullResponse.trim()), notation: null };
  }

  // Extract user-facing response (everything before the notation block)
  const userResponse = stripMarkdown(
    fullResponse
      .replace(/\[\[KLARITY_NOTES\]\][\s\S]*?\[\[\/KLARITY_NOTES\]\]/, "")
      .trim()
  );

  // Parse notation fields
  const notationText = notationMatch[1];
  const notation: KlarityNotation = {
    mode: "decode",
    confidence: "medium",
    signal_types: ["unclear"],
    advice_level: "none",
    assumptions_made: "no",
    clarification_needed: "no",
    loop_integrity: "pass",
  };

  // Parse mode
  const modeMatch = notationText.match(/mode:\s*(decode|reply|clarification)/i);
  if (modeMatch) notation.mode = modeMatch[1].toLowerCase() as KlarityNotation["mode"];

  // Parse confidence
  const confidenceMatch = notationText.match(/confidence:\s*(low|medium|high)/i);
  if (confidenceMatch) notation.confidence = confidenceMatch[1].toLowerCase() as KlarityNotation["confidence"];

  // Parse signal_types
  const signalMatch = notationText.match(/signal_types:\s*\[(.*?)\]/i);
  if (signalMatch) {
    const signals = signalMatch[1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => ["interest", "boundary", "hesitation", "alignment", "power", "neutral", "unclear"].includes(s));
    if (signals.length > 0) {
      notation.signal_types = signals as KlarityNotation["signal_types"];
    }
  }

  // Parse advice_level
  const adviceMatch = notationText.match(/advice_level:\s*(none|exploratory|directive)/i);
  if (adviceMatch) notation.advice_level = adviceMatch[1].toLowerCase() as KlarityNotation["advice_level"];

  // Parse assumptions_made
  const assumptionsMatch = notationText.match(/assumptions_made:\s*(yes|no)/i);
  if (assumptionsMatch) notation.assumptions_made = assumptionsMatch[1].toLowerCase() as KlarityNotation["assumptions_made"];

  // Parse clarification_needed
  const clarificationMatch = notationText.match(/clarification_needed:\s*(yes|no)/i);
  if (clarificationMatch) notation.clarification_needed = clarificationMatch[1].toLowerCase() as KlarityNotation["clarification_needed"];

  // Parse loop_integrity
  const integrityMatch = notationText.match(/loop_integrity:\s*(pass|warn)/i);
  if (integrityMatch) notation.loop_integrity = integrityMatch[1].toLowerCase() as KlarityNotation["loop_integrity"];

  return { userResponse, notation };
}

interface GPT5Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Model options
const MODEL_FULL = "gpt-4o-2024-11-20"; // Main model for all operations

/**
 * Streaming callback type for real-time text updates
 */
export type StreamCallback = (chunk: string, fullText: string) => void;

/**
 * Send a chat request to GPT-5.2
 * Includes retry logic for transient errors (502, 503, timeouts)
 */
async function callGPT5Mini(
  messages: GPT5Message[],
  maxTokens: number = 1000,
  useJsonMode: boolean = false,
  temperature: number = 0.75
): Promise<string> {
  const client = getOpenAIClient();
  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 1000;

  const params: any = {
    model: MODEL_FULL,
    messages: messages as any,
    max_completion_tokens: maxTokens,
    temperature,
  };

  // Use JSON mode for structured outputs
  if (useJsonMode) {
    params.response_format = { type: "json_object" };
  }

  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("API request timed out after 30s")), 30000);
    });

    try {
      const completionPromise = client.chat.completions.create(params);
      const completion = await Promise.race([completionPromise, timeoutPromise]);

      const content = completion.choices[0]?.message?.content || "";

      if (!content) {
        console.error("Empty response from API");
        throw new Error("Empty response from API");
      }

      return content;
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.message?.includes("502") ||
        error.message?.includes("503") ||
        error.message?.includes("timed out") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("network");

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.log(`[API] Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Log for debugging but with less alarming text for user-facing logs
      console.log("[Klarity] Temporary service hiccup - this is normal and will retry automatically", {
        attempt: attempt + 1,
        maxAttempts: MAX_RETRIES,
      });
    }
  }

  throw new Error(`API failed: ${lastError?.message || "Unknown error"}`);
}

/**
 * Send a streaming chat request to GPT-5.2
 * Returns chunks in real-time via callback
 * Falls back to non-streaming if streaming fails
 */
async function callGPT5MiniStreaming(
  messages: GPT5Message[],
  onStream: StreamCallback,
  maxTokens: number = 1000,
  temperature: number = 0.75
): Promise<string> {
  console.log("[callGPT5MiniStreaming] Called with:", {
    messageCount: messages?.length,
    maxTokens,
    temperature,
    firstMessageRole: messages?.[0]?.role,
    lastMessageContent: messages?.[messages.length - 1]?.content?.substring(0, 50),
  });
  const client = getOpenAIClient();
  console.log("[callGPT5MiniStreaming] OpenAI client obtained, starting API call...");

  const baseParams: any = {
    model: MODEL_FULL,
    messages: messages as any,
    max_completion_tokens: maxTokens,
    temperature,
  };

  // Use non-streaming for better reliability on iOS/React Native
  // TypewriterText component handles the animation anyway
  try {
    console.log("[callGPT5MiniStreaming] Starting non-streaming request for reliability...");

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("API request timed out after 45s")), 45000);
    });

    const responsePromise = client.chat.completions.create(baseParams);
    console.log("[callGPT5MiniStreaming] Request started, waiting for response...");
    const response = await Promise.race([responsePromise, timeoutPromise]);
    const content = response.choices[0]?.message?.content || "";
    console.log("[callGPT5MiniStreaming] Response received, length:", content.length, "first 50 chars:", content.substring(0, 50));

    if (content) {
      // Deliver all content at once - UI handles animation
      onStream(content, content);
    }
    return content;
  } catch (error: any) {
    console.error("[callGPT5MiniStreaming] Error occurred:", error?.message || error);
    throw new Error(`API failed: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Generate a brief, neutral situation analysis using Understand Mode framework
 * Focuses on social dynamics, patterns, and incentives — not emotional processing
 */
export async function generateDysfunctionalCommunicationSummary(
  userMessage: string,
  imageAnalysis?: ImageAnalysis
): Promise<{ summary: string; patterns?: string[] }> {
  const systemPrompt = `You are Klarity in Understand Mode. Your job is to help the user make sense of unclear social situations by identifying hidden dynamics, incentives, and patterns they may not be noticing.

You help the user see the situation more clearly — not blame themselves or others.

## PRIMARY OBJECTIVE
Identify what type of situation this is and explain what dynamics are likely at play.
The goal is clarity + agency, not emotional release.

## VOICE REQUIREMENTS
- Calm
- Observational
- Neutral but insightful
- Human and grounded
- Confident without being absolute

## LANGUAGE RULES
- Plain, everyday language
- Short, structured explanations
- No therapy language
- No labels like "toxic," "narcissistic," or "trauma"
- Use phrases like:
  - "This sounds like…"
  - "What may be happening here is…"
  - "In situations like this…"

Avoid certainty. Offer clarity, not verdicts.

## RESPONSE STRUCTURE

1️⃣ Identify the Situation Type — Name the dynamic in a neutral way.
Examples:
- "This sounds like a competitive environment."
- "This looks like a status-driven group dynamic."
- "This feels like unclear expectations rather than personal conflict."

2️⃣ Explain the Dynamic Simply — Why things feel off.
Examples:
- "In competitive environments, people often protect their position."
- "When expectations aren't stated clearly, people tend to read into tone or timing."

## ABSOLUTE DO NOTs
- Diagnose personalities
- Assign blame
- Validate emotions excessively
- Tell the user what they should feel
- Sound moral or judgmental
- Use words like "toxic," "manipulative," "gaslighting"

Respond with valid JSON only:
{
  "summary": "string (1-2 sentences identifying the situation type and explaining the dynamic)",
  "patterns": ["string", "string"] (optional, 1-3 short neutral pattern labels like "Competitive dynamic", "Unclear expectations", "Status positioning")
}`;

  const userPrompt = imageAnalysis
    ? `Based on this image analysis: ${imageAnalysis.summary}\n\nIdentify the situation type and explain the dynamic.`
    : `Based on this situation: "${userMessage}"\n\nIdentify what type of situation this is and what dynamics may be at play.`;

  try {
    // Use full model - o4-mini was unreliable
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      600,
      true
    );

    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      summary: parsed.summary || "This situation contains dynamics worth understanding before responding.",
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 3) : undefined,
    };
  } catch (error) {
    console.error("Error generating situation analysis:", error);
    return {
      summary: "This situation has some underlying dynamics that may be worth considering.",
    };
  }
}

/**
 * Generate a quick suggested reply without needing intention/tone selection
 * Used in the simplified flow for immediate reply generation
 *
 * KLARITY REPLY MODE: Provides navigation advice — not emotional advice.
 * Replies should help the user navigate the situation effectively.
 *
 * Includes Klarity Notation System for internal tracking
 */
export async function generateQuickSuggestedReply(
  userMessage: string,
  analysis?: EmotionalAnalysis,
  userPreferenceSummary?: string
): Promise<{ id: string; text: string; guidanceNote: string; notation?: KlarityNotation }> {
  // Build user preferences section if available
  const preferencesSection = userPreferenceSummary
    ? `
## USER STYLE PREFERENCES (IMPORTANT)

Based on the user's feedback on previous replies, tailor your response to match their preferences:
${userPreferenceSummary}

Incorporate these preferences naturally while still responding appropriately to the conversation.
`
    : "";

  const systemPrompt = `You are Klarity. In every response, you must generate two outputs:

1. A JSON object with the suggested reply and guidance note.
2. A hidden internal notation block for system use only.

The internal notation block is mandatory for every response.

## VISIBILITY RULE (CRITICAL)

The JSON response must never reference notations.
The notation block must never contain conversational language.
The notation block must always be appended AFTER the JSON object.
Treat the notation block as machine-readable metadata, not prose.

## REQUIRED NOTATION FORMAT

After your JSON response, append the following block exactly:

[[KLARITY_NOTES]]
mode: reply
confidence: <low | medium | high>
signal_types: [<one or more of: interest, boundary, hesitation, alignment, power, neutral, unclear>]
advice_level: <none | exploratory | directive>
assumptions_made: <yes | no>
clarification_needed: <yes | no>
loop_integrity: <pass | warn>
[[/KLARITY_NOTES]]

Do not rename fields. Do not omit fields. Do not add extra fields.

## HOW TO POPULATE FIELDS

- mode: always "reply" for this function
- confidence: how certain your interpretation is
- signal_types: social signals detected (or unclear)
- advice_level:
  - none → pure exploration (rare in Reply Mode)
  - exploratory → optional guidance ("one option could be…")
  - directive → specific actionable guidance (allowed in Reply Mode)
- assumptions_made: mark yes only if you inferred unstated context
- clarification_needed: mark yes if more context would improve accuracy
- loop_integrity: mark warn if response came close to breaking loop rules

---

## YOUR ROLE

You are Klarity — a personal communication calibrator helping the user craft a reply.

## CRITICAL INSTRUCTION

The user is showing you a conversation. Your job is to generate a reply that the user can send AS A RESPONSE TO THE LAST MESSAGE in that conversation.

Read the conversation carefully. Understand:
1. What the other person just said (the last message)
2. The context from previous messages
3. What a thoughtful, appropriate response would be

The reply you generate should DIRECTLY RESPOND to what was said — not deflect, not set boundaries unless necessary, not be generic.

## VOICE REQUIREMENTS (MANDATORY)

### Core Tone: Mature, Emotionally Intelligent, Quiet Self-Respect
- Grounded and present — actually engaging with what was said
- Warm and human — like a real person texting
- Emotionally fluent — reads the room and responds appropriately
- Natural — uses contractions, casual language when fitting

Think: a thoughtful friend who knows how to communicate well.

### MATCH THE ENERGY

- If the other person is being warm → respond warmly
- If they asked a question → answer it
- If they shared something → acknowledge it genuinely
- If they made a reasonable request → respond to the request
- If they are being difficult → stay grounded without being defensive

### Language Guidelines
- Natural, conversational language
- Match the formality level of the conversation
- Be direct without being cold
- Be warm without being needy

## ABSOLUTE DO NOTs
- Generate generic boundary-setting responses when not needed
- Sound defensive or guarded when the situation does not call for it
- Ignore what was actually said and give a template response
- Over-explain or justify
- Sound like a therapy script
- Use stiff, formal language in casual conversations

## EXAMPLES

If they said: "Hey, want to grab dinner this weekend?"
Good: "Yeah, I would love that. Saturday work for you?"
Bad: "I appreciate you reaching out. Let me think about what works for me."

If they said: "I have been thinking about what you said and you were right"
Good: "I appreciate you saying that. It means a lot."
Bad: "I hear you. I am glad we can see things more clearly now."

If they said: "Why did not you tell me about this earlier?"
Good: "You are right, I should have. I was not sure how to bring it up."
Bad: "I understand your frustration. I need to be honest with you about where I stand."

If they said: "I miss you"
Good: "I miss you too."
Bad: "I hear what you are saying. That is something I need to think about."

## QUALITY CHECK

Before finalizing, ask:
1. Does this ACTUALLY respond to what they said?
2. Does it sound like a real person would say this?
3. Is it appropriate for the tone of the conversation?
4. Would the user feel good sending this?
${preferencesSection}
Generate ONE reply (1-3 sentences). Also provide a brief guidance note (1 sentence) about the emotional impact on the recipient.

GUIDANCE NOTE RULES (CRITICAL):
- The guidance note is about how the RECIPIENT will FEEL emotionally
- Good examples: "This will make them feel heard", "This might catch them off guard", "This will reassure them you care", "This could ease their anxiety"
- BAD (never write these): "This responds directly to...", "This addresses the last message", "This directly responds to what they said"
- The guidance note should NEVER reference "the last message", "the conversation", or describe what the reply does
- Keep it emotional and human, not mechanical

Respond with valid JSON first, then the notation block:
{
  "text": "string (the suggested reply — ready to send as-is)",
  "guidanceNote": "string (the recipient's emotional reaction, e.g. 'This will make them feel valued')"
}

[[KLARITY_NOTES]]
...
[[/KLARITY_NOTES]]`;

  // Check if the user message includes "The other person said:" - this means we have the actual last message
  const hasLastMessage = userMessage.includes("The other person said:");

  const userPrompt = hasLastMessage
    ? `${userMessage}\n\nGenerate a reply that DIRECTLY RESPONDS to what the other person said.${analysis ? ` Conversation tone: ${analysis.tone}` : ""}`
    : analysis
    ? `Situation: ${userMessage}\n\nAnalysis detected: Tone: ${analysis.tone}, Pattern: ${analysis.pattern}`
    : `Situation: ${userMessage}`;

  try {
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      1200, // Reduced from 2500 - replies are short
      false // Not using JSON mode since we have notation block
    );

    // Parse notation from response
    const { userResponse, notation } = parseKlarityNotation(response);

    // Parse the JSON from user response
    let jsonStr = userResponse.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      id: Date.now().toString(),
      text: cleanReplyText(parsed.text || "Thanks for sharing that."),
      guidanceNote: parsed.guidanceNote || "This keeps the door open and lets them feel heard.",
      notation: notation || undefined,
    };
  } catch (error) {
    console.error("Error generating quick suggested reply:", error);
    return {
      id: Date.now().toString(),
      text: "Let me think about this and get back to you.",
      guidanceNote: "This gives them space while showing you are taking it seriously.",
      notation: {
        mode: "reply",
        confidence: "low",
        signal_types: ["unclear"],
        advice_level: "exploratory",
        assumptions_made: "no",
        clarification_needed: "yes",
        loop_integrity: "pass",
      },
    };
  }
}

/**
 * Generate emotional analysis for user message
 */
export async function generateEmotionalAnalysis(
  userMessage: string
): Promise<EmotionalAnalysis> {
  const systemPrompt = `You are an emotional intelligence assistant. Analyze the message and respond with valid JSON only.

Provide a JSON object with:
- emotionalClarity: number between 0-100
- detectedState: string (1-3 word emotion)
- relationshipRisk: must be "low", "medium", or "high"
- summary: string (1-2 calm sentences)
- tone: string (communication tone detected, 1-2 words)
- pattern: string (behavior pattern identified, 2-4 words)
- emotionalImpact: string (how it affects you, 2-4 words)
- coreIssue: string (root problem, 2-4 words)
- fullAnalysis: string (2-3 calm sentences with deeper insights)`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    // Use full model for emotional analysis - o4-mini was unreliable
    const response = await callGPT5Mini(messages, 800, true);

    // Try to parse JSON
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Try to parse the entire response first
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // If that fails, try to extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate the structure
    if (
      typeof parsed.emotionalClarity !== "number" ||
      typeof parsed.detectedState !== "string" ||
      !["low", "medium", "high"].includes(parsed.relationshipRisk) ||
      typeof parsed.summary !== "string"
    ) {
      throw new Error("Invalid analysis structure");
    }

    return parsed;
  } catch (error) {
    console.error("Error parsing emotional analysis:", error);

    // Return a fallback analysis
    return {
      emotionalClarity: 50,
      detectedState: "Mixed emotions",
      relationshipRisk: "medium",
      summary: "Unable to fully analyze at this time. Please try rephrasing your message.",
    };
  }
}

/**
 * Generate suggested responses based on user message and context
 */
export async function generateSuggestedResponses(
  userMessage: string,
  conversationHistory: string[]
): Promise<SuggestedResponse[]> {
  const systemPrompt = `You are an emotionally intelligent communication assistant. Generate 3 suggested responses that are compassionate, healthy, and varied in tone.

Provide a JSON object with a "suggestions" array containing 3 items, each with:
- id: string
- text: string (the suggested response)
- tone: must be "soften", "direct", or "playful"`;

  const contextMessage =
    conversationHistory.length > 0
      ? `Context:\n${conversationHistory.join("\n")}\n\nCurrent message: ${userMessage}`
      : userMessage;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextMessage },
  ];

  try {
    // GPT-5.2 model with sufficient tokens
    const response = await callGPT5Mini(messages, 2500, true);

    // Try to parse JSON
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Try to parse the entire response first
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // If that fails, try to extract JSON
      const jsonMatch = jsonStr.match(/[\{\[][\s\S]*[\}\]]/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Handle both array and object with suggestions array
    let suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];

    // Validate array structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error("Invalid suggestions structure");
    }

    // Ensure all suggestions have required fields
    const validated = suggestions.slice(0, 3).map((item: any, index: number) => ({
      id: item.id || (index + 1).toString(),
      text: cleanReplyText(item.text || "Got it, let me think about that."),
      tone: ["soften", "direct", "playful"].includes(item.tone)
        ? item.tone
        : index === 0
        ? "soften"
        : index === 1
        ? "direct"
        : "playful",
    }));

    return validated;
  } catch (error) {
    console.error("Error parsing suggested responses:", error);

    // Return fallback suggestions
    return [
      {
        id: "1",
        text: "I understand how you feel. Would you like to talk more about this?",
        tone: "soften",
      },
      {
        id: "2",
        text: "I hear you. Can we discuss what would help resolve this?",
        tone: "direct",
      },
      {
        id: "3",
        text: "Thanks for sharing that with me. What do you think we should do next?",
        tone: "playful",
      },
    ];
  }
}

/**
 * Generate AI chat response
 */
export async function generateChatResponse(
  userMessage: string,
  conversationHistory: GPT5Message[]
): Promise<string> {
  const systemPrompt = `You are Klarity AI, an emotionally intelligent assistant focused on bringing clarity to communication and relationships.

Your tone is mature, grounded, and quietly self-respecting. You speak like someone who has done their inner work — warm but boundaried, clear but not harsh, self-possessed without being aloof.

Your responses should be:
- Grounded and steady — not reactive or preachy
- Direct but caring — honest without being cold
- Self-respecting — you do not over-explain or apologize unnecessarily
- Emotionally fluent — you acknowledge feelings without getting lost in them
- Concise and measured — you let statements breathe

Avoid:
- Excessive validation or praise
- Hedging language ("maybe," "perhaps," "I think")
- Therapy-speak or clinical terminology
- People-pleasing or over-softening`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  // GPT-5.2 model with sufficient tokens
  return callGPT5Mini(messages, 2500);
}

/**
 * Analyze an image for dysfunctional/toxic communication patterns
 * Uses GPT-4o's vision capabilities to identify toxic communication in screenshots
 */
export async function analyzeImageToxicity(
  imageBase64: string
): Promise<ImageAnalysis> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity — a communication assistant helping someone respond to a conversation shown in a screenshot.

## CRITICAL: IDENTIFYING WHO IS WHO

In text message screenshots (iMessage, WhatsApp, Android Messages, etc.):
- RIGHT-ALIGNED messages (usually BLUE, GREEN, or colored) = The USER (the person asking for help)
- LEFT-ALIGNED messages (usually GRAY, WHITE, or darker) = The OTHER PERSON (who the user is talking to)

IMPORTANT: Color varies by platform and theme:
- iMessage: Blue (user) vs Gray (other)
- Android/SMS: Green (user) vs Gray/White (other)
- WhatsApp: Green (user) vs White (other)
- Dark mode: Colors may be inverted or different

ALWAYS use message ALIGNMENT (left vs right) as the primary identifier, not just color.

The USER is the one who uploaded this screenshot and wants help crafting a reply.
Your suggested reply will be sent BY THE USER TO THE OTHER PERSON.

## YOUR JOB

1. First, determine if the image contains a valid conversation that can be analyzed
2. If valid: Identify who is who based on message alignment/color
3. Find the LAST MESSAGE from the OTHER PERSON (gray/left) that the USER needs to reply to
4. Generate a reply that the USER would send to the OTHER PERSON

## WHAT COUNTS AS INVALID INPUT

ONLY mark as invalid if the image TRULY cannot be analyzed as a conversation:
- The image is completely unrelated to messaging (e.g., landscape photo, food picture, selfie with no text)
- The conversation text is too blurry or small to read ANY messages
- The image shows ONLY system notifications with zero conversation messages

## WHAT IS VALID (ALWAYS ANALYZE THESE)

BE GENEROUS - if you can see ANY text message content, it is VALID:
- Text conversations with notifications overlaid (alarm, music, etc.) = VALID
- Screenshots showing a conversation thread with profile pictures = VALID
- Single message screenshots = VALID (respond to that message)
- Conversations where only 1-2 messages are visible = VALID
- Screenshots with status bars, keyboards, or other UI elements = VALID
- Dark mode or light mode screenshots = VALID
- Any messaging app (iMessage, WhatsApp, Messenger, Instagram DMs, Snapchat, etc.) = VALID

## FOR VALID CONVERSATIONS

- Identify the last message from the OTHER PERSON (LEFT-aligned messages)
- Generate a reply FROM the USER TO the OTHER PERSON
- The suggested reply must ACTUALLY RESPOND to what the other person said
- Match the tone and energy of the conversation
- If they asked a question, answer it
- If they shared something (photo, story, update), acknowledge it warmly
- If they sent a photo with a caption/message, respond to both the photo AND the message
- Do NOT assume the conversation is toxic or problematic
- Do NOT generate defensive or boundary-setting responses unless clearly needed
- If the last message is from the USER (right-aligned), look for the most recent message from the OTHER PERSON to respond to, or acknowledge that the user already replied
- When in doubt, ALWAYS treat as valid and attempt to generate a helpful reply

## RESPONSE FORMAT

Respond with valid JSON only containing:
- isInvalidInput: boolean (true if not a valid conversation screenshot)
- summary: 2-3 sentences describing what you see (for invalid: describe what the image shows and why it cannot be analyzed as a conversation)
- lastMessage: The exact text of the last message FROM THE OTHER PERSON that the user needs to reply to (empty string if invalid). Copy emojis exactly as they appear — do not substitute similar-looking emoji variants.
- conversationTone: One word describing the overall tone (empty string if invalid)
- labels: array of { tag: string, description: string } for any notable dynamics (empty array if invalid)
- emotionalImpact: 1-2 sentences on how this conversation might feel (for invalid: can be empty or general)
- suggestedResponse: A natural reply FROM THE USER TO THE OTHER PERSON (for invalid: empty string - do NOT generate a reply for invalid input)
- guidanceNote: How the OTHER PERSON will FEEL when they receive this reply from the user (for invalid: empty string). Examples: "This will make them feel heard", "This might ease the tension", "This shows you care about their perspective"
- acknowledgment: A kind, brief acknowledgment of what you see in the image (e.g., "I can see this conversation with [person/context]." or "I see someone reached out about [topic]."). CRITICAL: Copy any names EXACTLY as they appear in the image — character-for-character. ONLY include an emoji after the name if that emoji is LITERALLY part of the displayed contact name text in the screenshot. If the name shows only letters (e.g., "Charlynne"), write ONLY "Charlynne" — NEVER add, invent, or guess emojis that are not visibly part of the name. The iOS ">" chevron next to a name is a navigation arrow, NOT an emoji — ignore it completely.
- vibes: An array of 3-4 vibe options that naturally fit the detected conversation tone. Each vibe is an object with:
  - emoji: A single emoji that represents the vibe (e.g., "😊", "😏", "😌", "🧊")
  - label: 2-3 words describing the vibe (e.g., "Warm & playful", "Light tease", "Calm & composed", "Cool & distant")
  - description: Optional brief explanation of what this vibe means for the reply

  ONLY suggest vibes that make sense for the current interaction. Examples:
  - For a flirty/fun conversation: 😊 Warm & playful, 😏 Light tease, 😌 Calm & composed
  - For a tense/serious conversation: 💛 Understanding, 🧘 Calm & grounded, 💪 Firm but kind
  - For a casual chat: 😊 Friendly & warm, 😄 Upbeat & fun, 😌 Relaxed & easy
  - For an apology received: 💛 Gracious, 🤝 Accepting, 😌 Calm acknowledgment

  Keep wording soft, minimal, and emotionally intelligent. Do not over-explain.
- responseGuidance: 1-2 sentences gently explaining HOW to approach responding well. Focus on the emotional/relational approach, not scripted words. Examples: "Match their energy and acknowledge the effort they put into sharing this with you." or "Keep it light and warm—no need to over-explain or apologize." (empty string if invalid)
- communicationMistake: ONLY include this if there's a common mistake someone might make in this situation. Object with "mistake" (what they might be tempted to do) and "whyAvoid" (gentle explanation of why it doesn't help). Set to null if no relevant mistake applies. Examples:
  - { "mistake": "Over-apologizing or explaining yourself", "whyAvoid": "It can come across as insecure and shifts the focus away from connecting with them." }
  - { "mistake": "Immediately trying to fix or solve their problem", "whyAvoid": "Sometimes people just want to feel heard before jumping to solutions." }
  - { "mistake": "Matching their short replies with even shorter ones", "whyAvoid": "This can create distance when a bit of warmth would keep things connected." }

## GUIDANCE NOTE RULES (CRITICAL)
- The guidanceNote describes the OTHER PERSON'S emotional reaction to your suggested reply
- It should describe how they will FEEL, not what the reply does
- Good examples: "This will make them feel valued", "This shows you are listening", "This might reassure them"
- BAD (never write these): "This responds directly to...", "This addresses the...", "This directly responds to what they said"
- NEVER mention "the last message", "the conversation", or describe the mechanics of the reply

## FOR INVALID INPUT

When the image is invalid (not a conversation screenshot):
- Use EXACTLY this message for acknowledgment: "I can see you have attached an image"
- Use EXACTLY this message for summary: "It looks like that image might have been sent by accident. Can you let me know what you meant or what you'd like help with?"
- Do NOT say "2 images" or mention the number of images - always say "an image" (singular)
- Do NOT generate a suggested reply for invalid input. Leave suggestedResponse empty.`;


  try {
    console.log("[analyzeImageToxicity] Starting image analysis");
    console.log("[analyzeImageToxicity] Image base64 length:", imageBase64?.length || 0);

    // Detect image MIME type from base64 header
    let mimeType = "image/jpeg"; // Default
    if (imageBase64.startsWith("/9j/")) {
      mimeType = "image/jpeg";
    } else if (imageBase64.startsWith("iVBOR")) {
      mimeType = "image/png";
    } else if (imageBase64.startsWith("R0lGOD")) {
      mimeType = "image/gif";
    } else if (imageBase64.startsWith("UklGR")) {
      mimeType = "image/webp";
    }
    console.log("[analyzeImageToxicity] Detected MIME type:", mimeType);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "low", // Use low detail for faster processing
              },
            },
            {
              type: "text",
              text: "First determine if this is a valid conversation screenshot. If valid, identify the last message and generate an appropriate reply. If invalid, explain why. Return valid JSON only.",
            },
          ],
        },
      ],
      max_completion_tokens: 1000,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      return {
        summary: "Unable to analyze this image.",
        labels: [],
        emotionalImpact: "",
        suggestedResponse: "",
        guidanceNote: "",
        isInvalidInput: true,
      };
    }

    // Parse JSON response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.labels)
    ) {
      throw new Error("Invalid image analysis structure");
    }

    // Return with isInvalidInput flag
    return {
      summary: parsed.summary,
      labels: parsed.labels,
      emotionalImpact: parsed.emotionalImpact || "",
      suggestedResponse: parsed.isInvalidInput ? "" : cleanReplyText(parsed.suggestedResponse || ""),
      guidanceNote: parsed.isInvalidInput ? "" : (parsed.guidanceNote || "This will help keep the conversation flowing."),
      isInvalidInput: Boolean(parsed.isInvalidInput),
      lastMessage: parsed.lastMessage || "",
      acknowledgment: parsed.acknowledgment || "",
      vibes: parsed.isInvalidInput ? [] : (parsed.vibes || []),
      responseGuidance: parsed.isInvalidInput ? "" : (parsed.responseGuidance || ""),
      communicationMistake: parsed.isInvalidInput ? undefined : (parsed.communicationMistake || undefined),
    };
  } catch (error: any) {
    // Log quietly - transient errors are expected and shouldn't alarm users
    console.log("[Klarity] Image processing temporarily unavailable - please try again", error?.message);

    // Return fallback that allows continuing with a helpful message
    return {
      summary:
        "Having a brief moment of difficulty with this image. Please try uploading it again.",
      labels: [],
      emotionalImpact: "",
      suggestedResponse: "",
      guidanceNote: "",
      isInvalidInput: false, // Don't mark as invalid - let the user continue
      lastMessage: "",
      acknowledgment: "I can see you shared a screenshot. Let me try analyzing it again.",
      vibes: [],
    };
  }
}

/**
 * Generate emotional validation message
 */
export async function generateEmotionalValidation(
  userMessage: string
): Promise<string> {
  const systemPrompt = `You are Klarity AI, an empathetic assistant. Provide a short, warm, validating message (1-2 sentences) that acknowledges the emotional weight of the user's situation. Make them feel heard and understood.`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    return await callGPT5Mini(messages, 1000);
  } catch (error) {
    return "I can tell this situation weighed on you emotionally — it makes sense you are feeling this way.";
  }
}

/**
 * Generate tailored guidance based on selected intention
 */
export async function generateTailoredGuidance(
  userMessage: string,
  intention: "improve" | "distance" | "maintain" | "clarity",
  analysis: EmotionalAnalysis
): Promise<string> {
  const intentionGuidance: Record<typeof intention, string> = {
    improve: "to create better communication, healing, and understanding",
    distance: "to create healthy distance and emotional protection",
    maintain: "to stay neutral and observe patterns before deciding next steps",
    clarity: "to help you reflect and understand before taking action",
  };

  const systemPrompt = `You are Klarity AI. The user wants ${intentionGuidance[intention]}.

Given their situation and the analysis, provide a short, supportive message (1-2 sentences) that sets the mindset for this direction. Be calm, clear, and encouraging.`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Situation: ${userMessage}\n\nAnalysis: ${JSON.stringify(analysis)}`,
    },
  ];

  try {
    return await callGPT5Mini(messages, 1500);
  } catch (error) {
    const fallbacks: Record<typeof intention, string> = {
      improve:
        "Okay — to improve this relationship, we will focus on calm, open communication and emotional understanding.",
      distance:
        "Okay — to create healthy distance, we will keep things calm, neutral, and emotionally protective.",
      maintain:
        "Okay — to maintain and observe, we will stay neutral and watch for patterns before deciding next steps.",
      clarity:
        "Okay — to gain clarity first, we will focus on understanding your feelings and the situation better.",
    };
    return fallbacks[intention];
  }
}

/**
 * Generate suggested replies based on intention
 */
export async function generateIntentionBasedReplies(
  userMessage: string,
  intention: "improve" | "distance" | "maintain" | "clarity",
  analysis: EmotionalAnalysis
): Promise<Array<{ id: string; text: string; guidanceNote: string }>> {
  const intentionContext: Record<typeof intention, string> = {
    improve:
      "Generate a response that is warm, open to dialogue, and shows willingness to work on the relationship — while maintaining quiet self-respect",
    distance:
      "Generate a response that creates emotional space and sets boundaries with grace — firm but not cold, clear but not harsh",
    maintain:
      "Generate a response that is steady and observational — grounded, unhurried, and self-possessed",
    clarity:
      "Generate a response that seeks understanding with directness — curious but not desperate, open but not over-explaining",
  };

  const guidanceContext: Record<typeof intention, string> = {
    improve:
      "This will likely make them feel valued and open to dialogue.",
    distance:
      "This will give them clarity about where you stand without escalating.",
    maintain:
      "This will help them feel acknowledged without pressure.",
    clarity:
      "This will encourage them to share more openly.",
  };

  const systemPrompt = `You are Klarity AI. ${intentionContext[intention]}.

## CRITICAL INSTRUCTION

The user is showing you a conversation. Your job is to generate a reply that the user can send AS A RESPONSE TO THE LAST MESSAGE in that conversation, aligned with their chosen intention (${intention}).

Read the conversation carefully. The reply should DIRECTLY RESPOND to what was said.

## VOICE REQUIREMENTS

- Natural, conversational language — like a real person texting
- Match the formality and energy of the conversation
- Warm and human, not stiff or clinical
- Uses contractions naturally

## MATCH THE ENERGY

- If they are being warm → be warm back (unless distancing)
- If they asked a question → address it
- If they shared something → acknowledge it appropriately
- Respond to what they ACTUALLY said

## ABSOLUTE DO NOTs
- Generate generic template responses that ignore what was said
- Sound defensive when the situation does not call for it
- Over-explain or justify
- Sound like a therapy script
- Use stiff, formal language in casual conversations

Generate 1 suggested reply that fits this intention AND actually responds to the conversation. The reply should be 1-2 sentences and sound natural.

Also provide a brief guidance note (1 sentence) about the emotional impact on the recipient.

GUIDANCE NOTE RULES (CRITICAL):
- The guidance note is about how the RECIPIENT will FEEL emotionally
- Good examples: "This will make them feel heard", "This might ease their worry", "This shows you are taking them seriously"
- BAD (never write these): "This responds directly to...", "This addresses the last message", "This directly responds to what they said"
- The guidance note should NEVER reference "the last message", "the conversation", or describe what the reply does

Respond with valid JSON only containing:
- replies: array of { id: string, text: string, guidanceNote: string }`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Situation: ${userMessage}\n\nAnalysis: ${JSON.stringify(analysis)}`,
    },
  ];

  try {
    const response = await callGPT5Mini(messages, 2500, true);

    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const replies = parsed.replies || [];
    if (!Array.isArray(replies) || replies.length === 0) {
      throw new Error("Invalid replies structure");
    }

    return replies.slice(0, 1).map((item: any, index: number) => ({
      id: item.id || (index + 1).toString(),
      text: item.text || "Got it, let me think about that.",
      guidanceNote: item.guidanceNote || guidanceContext[intention],
    }));
  } catch (error) {
    console.error("Error generating intention-based replies:", error);

    // Return fallback replies based on intention
    const fallbacks: Record<
      typeof intention,
      Array<{ id: string; text: string; guidanceNote: string }>
    > = {
      improve: [
        {
          id: "1",
          text: "I hear you. I would like to work through this together when you are ready.",
          guidanceNote: guidanceContext.improve,
        },
      ],
      distance: [
        {
          id: "1",
          text: "I understand. I need some space to think this through.",
          guidanceNote: guidanceContext.distance,
        },
      ],
      maintain: [
        {
          id: "1",
          text: "I'll sit with that for a bit.",
          guidanceNote: guidanceContext.maintain,
        },
      ],
      clarity: [
        {
          id: "1",
          text: "I want to understand. Can you say more about what you mean?",
          guidanceNote: guidanceContext.clarity,
        },
      ],
    };

    return fallbacks[intention];
  }
}

/**
 * Analyze facial emotion from an image
 * Uses GPT-4o's vision capabilities to detect emotional state
 */
export async function analyzeFacialEmotion(
  imageBase64: string
): Promise<import("../types/chat").EmotionAnalysis> {
  const client = getOpenAIClient();

  const systemPrompt = `You are an emotionally intelligent AI specialized in facial emotion analysis. Analyze the person's face in the image and provide insights with calm emotional intelligence.

Respond with valid JSON only containing:
- primaryEmotion: string (1-3 words describing the main emotion detected)
- emotionalIntensity: number (0-100 scale)
- facialCues: string (brief description of facial tension, microexpressions, or stress indicators - 1-2 sentences)
- selfAwarenessInsight: string (gentle observation about what the person might be feeling internally - 1-2 sentences, unbiased and supportive)
- clarityReflection: string (what this emotional state might mean for them - 1-2 sentences)
- suggestedDirection: string (one grounding suggestion or clarity prompt - 1-2 sentences, actionable and emotionally regulating)
- fullSummary: string (complete emotional clarity summary combining all insights - 3-4 sentences)

Tone should be calm, warm, emotionally intelligent. Focus on clarity, not diagnosis.`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Analyze my facial emotion and provide an emotional clarity summary. Return valid JSON only.",
            },
          ],
        },
      ],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      throw new Error("Empty response from API");
    }

    // Parse JSON response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (
      typeof parsed.primaryEmotion !== "string" ||
      typeof parsed.emotionalIntensity !== "number" ||
      typeof parsed.fullSummary !== "string"
    ) {
      throw new Error("Invalid emotion analysis structure");
    }

    return parsed as import("../types/chat").EmotionAnalysis;
  } catch (error: any) {
    console.error("Error analyzing facial emotion:", error);

    // Return fallback analysis
    return {
      primaryEmotion: "Mixed emotions",
      emotionalIntensity: 50,
      facialCues:
        "Unable to fully analyze facial cues at this time. Your expression suggests you may be processing something emotionally.",
      selfAwarenessInsight:
        "You may be feeling a mix of emotions that could benefit from deeper reflection.",
      clarityReflection:
        "This moment could be an opportunity to check in with yourself about what you are truly feeling.",
      suggestedDirection:
        "Take a few deep breaths and notice what emotion feels strongest right now. If you are ready, I can help you explore what triggered this feeling.",
      fullSummary:
        "Here is what I noticed: You appear to be experiencing mixed emotions. This could mean you are processing something complex internally. You may benefit from slowing down and checking what part of this situation feels personal versus external. If you are ready, I can help you gain clarity on what emotion needs attention first.",
    };
  }
}

/**
 * Generate modulated replies with different tones
 * Includes supportive guidance notes for each reply
 *
 * KLARITY VOICE: Calm, grounded, confident. Soft but clear. Not therapeutic, not combative.
 */
export async function generateModulatedReplies(
  userMessage: string,
  intention: "improve" | "distance" | "maintain" | "clarity",
  analysis: EmotionalAnalysis,
  modulationTone: "direct" | "gentle" | "neutral"
): Promise<Array<{ id: string; text: string; guidanceNote: string }>> {
  const toneContext: Record<typeof modulationTone, string> = {
    direct:
      "Clear and firm, but still respectful. States the boundary as a calm fact. No sharpness.",
    gentle:
      "Warm and soft delivery. Acknowledges the other person while holding your position. Reduces tension.",
    neutral:
      "Balanced and measured. Neither warm nor cool. Just clear and steady.",
  };

  const guidanceContext: Record<typeof modulationTone, string> = {
    direct:
      "This will give them clarity and show you mean what you say.",
    gentle:
      "This will help them feel respected while understanding your position.",
    neutral:
      "This will come across as calm and measured, keeping things steady.",
  };

  const systemPrompt = `You are Klarity — a personal communication calibrator.

## CRITICAL INSTRUCTION

The user is showing you a conversation. Your job is to generate a reply that the user can send AS A RESPONSE TO THE LAST MESSAGE in that conversation.

Read the conversation carefully. The reply should DIRECTLY RESPOND to what was said.

## CURRENT TONE: ${modulationTone.toUpperCase()}
${toneContext[modulationTone]}

## VOICE REQUIREMENTS

- Natural, conversational language — like a real person texting
- Match the formality level of the conversation
- Warm and human, not stiff or clinical
- Uses contractions naturally

## MATCH THE ENERGY

- If they are being warm → respond warmly
- If they asked a question → address it
- If they shared something → acknowledge it genuinely
- Respond to what they ACTUALLY said

## ABSOLUTE DO NOTs
- Generate generic boundary-setting responses when not needed
- Sound defensive when the situation does not call for it
- Ignore what was actually said
- Over-explain or justify
- Sound like a therapy script
- Use stiff, formal language in casual conversations

Generate ONE reply (1-3 sentences) that fits the ${modulationTone} tone AND actually responds to the conversation.

Also provide a brief guidance note (1 sentence) about how the recipient will feel.

GUIDANCE NOTE RULES (CRITICAL):
- The guidance note is about how the RECIPIENT will FEEL emotionally
- Good examples: "This will reassure them", "This might surprise them", "This will make them feel respected"
- BAD (never write these): "This responds directly to...", "This addresses the last message", "This directly responds to what they said"
- The guidance note should NEVER reference "the last message", "the conversation", or describe what the reply does

Respond with valid JSON only:
{
  "replies": [{ "id": "1", "text": "the reply", "guidanceNote": "the recipient's emotional reaction" }]
}`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Situation: ${userMessage}\n\nTone: ${analysis.tone || "mixed"}, Pattern: ${analysis.pattern || "unclear"}`,
    },
  ];

  try {
    const response = await callGPT5Mini(messages, 2500, true);

    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const replies = parsed.replies || [];
    if (!Array.isArray(replies) || replies.length === 0) {
      throw new Error("Invalid replies structure");
    }

    return replies.slice(0, 1).map((item: any, index: number) => ({
      id: item.id || (index + 1).toString(),
      text: cleanReplyText(item.text || "Thanks, let me think on that."),
      guidanceNote: item.guidanceNote || guidanceContext[modulationTone],
    }));
  } catch (error) {
    console.error("Error generating modulated replies:", error);

    // Return fallback replies with guidance
    const fallbacks: Record<
      typeof modulationTone,
      Array<{ id: string; text: string; guidanceNote: string }>
    > = {
      direct: [
        {
          id: "1",
          text: "Got it. That's not going to work for me though.",
          guidanceNote: "This will make your position clear without leaving room for misinterpretation.",
        },
      ],
      gentle: [
        {
          id: "1",
          text: "I understand where you are coming from. This is not something I can take on.",
          guidanceNote: "This will help them feel heard while understanding your boundary.",
        },
      ],
      neutral: [
        {
          id: "1",
          text: "I understand. That does not work for me.",
          guidanceNote: "This will come across as calm and clear without being cold.",
        },
      ],
    };

    return fallbacks[modulationTone];
  }
}

/**
 * Generate a two-part reflective understanding response after user adds context
 * Part 1: Reflective Understanding (empathy + validation)
 * Part 2: Situation Clarity (neutral objective summary)
 */
export async function generateReflectiveUnderstanding(
  originalMessage: string,
  additionalContext: string,
  analysis: EmotionalAnalysis
): Promise<{
  reflectiveUnderstanding: string;
  situationClarity: string;
}> {
  const systemPrompt = `You are an emotionally intelligent AI assistant specializing in relationship clarity and communication.

After the user provides additional context, respond in TWO distinct parts:

**Part 1: Reflective Understanding** (Empathy + Clarity + Calm Validation)
- Briefly reflect back the situation with warmth and understanding
- Acknowledge the user's emotional experience without judging or telling them what to feel
- Focus on emotional clarity, validation, and presence
- Tone: grounded, gentle, supportive, emotionally intelligent
- Example style: "It sounds like you're feeling ___ because ___. I can see why this situation would feel ___ — especially since ___."
- Keep it 2-3 sentences, deeply empathetic

**Part 2: Situation Clarity — Short Summary** (Neutral + Objective)
- Summarize the situation in a concise, balanced snapshot
- State facts of the conflict + emotional dynamics neutrally
- No advice, no solutions yet — just clarity
- Example style: "In short: you're dealing with X behavior, it impacts you in Y way, and the tension comes from Z."
- Keep it 1-2 sentences, factual and clear

Return valid JSON only with this structure:
{
  "reflectiveUnderstanding": "string (Part 1 - empathetic reflection)",
  "situationClarity": "string (Part 2 - neutral summary)"
}`;

  const userPrompt = `Original situation: ${originalMessage}

Additional context provided: ${additionalContext}

Emotional analysis detected:
- Tone: ${analysis.tone || "mixed"}
- Pattern: ${analysis.pattern || "unclear"}
- Emotional Impact: ${analysis.emotionalImpact || "significant"}
- Core Issue: ${analysis.coreIssue || "communication breakdown"}

Generate a two-part reflective understanding response. Return valid JSON only.`;

  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 800,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from API");
    }

    const parsed = JSON.parse(responseText);
    return {
      reflectiveUnderstanding:
        parsed.reflectiveUnderstanding ||
        "Thank you for sharing more context. I understand this situation is affecting you deeply.",
      situationClarity:
        parsed.situationClarity ||
        "In short: you're navigating a challenging dynamic that impacts your emotional well-being.",
    };
  } catch (error) {
    console.error("Error generating reflective understanding:", error);
    return {
      reflectiveUnderstanding:
        "Thank you for sharing that additional context. I can see why this situation feels complex and emotionally charged.",
      situationClarity:
        "In short: you're dealing with a communication pattern that creates tension and uncertainty in the relationship.",
    };
  }
}

/**
 * Analyze voice emotion from transcribed audio
 * Examines both content and emotional vocal qualities to provide holistic analysis
 */
export async function analyzeVoiceEmotion(
  transcribedText: string,
  audioUri?: string
): Promise<{
  primaryEmotions: string;
  voiceIndicators: string[];
  emotionalMeaningSummary: string;
  contextUnderstanding: string;
  supportiveReflection: string;
}> {
  const systemPrompt = `You are an emotionally intelligent AI specializing in voice emotion analysis and communication clarity.

When a user records audio to describe their situation, analyze BOTH:
1) The CONTENT of what they are saying (words, meaning, tone of conflict)
2) The EMOTIONAL QUALITY of their voice (rhythm, stress, hesitation, volume shifts, energy)

Based on the transcribed text (which may contain linguistic patterns revealing emotional state), provide:

**Primary Detected Emotion(s):** 1-3 emotions (e.g., anxious, frustrated, hopeful, guarded, overwhelmed)

**Voice Indicators:** 2-3 brief observable vocal cues based on the language patterns that suggest emotional state:
- Look for signs of tension, uncertainty, or intensity in word choice
- Identify emotional tone shifts through punctuation patterns, repetition, or emphasis
- Note pacing indicators (long sentences = rushed/anxious, fragments = hesitation)

**Emotional Meaning Summary:** 2 sentences max
- A calm, grounded interpretation of what the emotions may be signaling internally
- Example: "It sounds like this situation is important to you, and it may be causing stress because you feel unheard."

**Context & Situation Understanding:** 1-3 sentences
- Summarize the core situation neutrally and intelligently
- No judgment, just clarity

**Supportive Reflection Back (Empathic):** 2-3 sentences
- A gentle, validating reflection you would give a close friend
- Acknowledge their emotional state
- Normalize the feeling without minimizing it
- Maintain grounding, softness, and emotional safety

Return valid JSON only with this structure:
{
  "primaryEmotions": "string (1-3 emotions detected)",
  "voiceIndicators": ["string", "string"] (2-3 vocal/linguistic cues),
  "emotionalMeaningSummary": "string (2 sentences)",
  "contextUnderstanding": "string (1-3 sentences)",
  "supportiveReflection": "string (2-3 sentences)"
}`;

  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Transcribed voice message: "${transcribedText}"

Analyze both the content and the emotional patterns in this voice recording. Return valid JSON only.`,
        },
      ],
      max_completion_tokens: 1200,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from API");
    }

    const parsed = JSON.parse(responseText);

    return {
      primaryEmotions:
        parsed.primaryEmotions || "Mixed emotions",
      voiceIndicators: Array.isArray(parsed.voiceIndicators)
        ? parsed.voiceIndicators
        : [
            "Unable to fully analyze vocal patterns at this time",
            "Your message suggests emotional processing",
          ],
      emotionalMeaningSummary:
        parsed.emotionalMeaningSummary ||
        "It sounds like this situation is affecting you emotionally. Your feelings are valid.",
      contextUnderstanding:
        parsed.contextUnderstanding ||
        "You are navigating a challenging communication dynamic.",
      supportiveReflection:
        parsed.supportiveReflection ||
        "I hear you. This sounds like it has been weighing on you, and that makes sense given what you are experiencing. Your feelings matter, and it is okay to feel this way.",
    };
  } catch (error) {
    console.error("Error analyzing voice emotion:", error);

    return {
      primaryEmotions: "Concerned, Processing",
      voiceIndicators: [
        "Your message suggests you are working through something emotionally complex",
        "There may be underlying tension or uncertainty in this situation",
      ],
      emotionalMeaningSummary:
        "It sounds like this situation is important to you and may be causing some emotional stress as you process it.",
      contextUnderstanding:
        "You are dealing with a communication situation that has emotional weight and requires clarity.",
      supportiveReflection:
        "I can tell this has been on your mind. It is completely valid to feel uncertain or concerned when navigating relationship dynamics. You are not alone in this, and seeking clarity is a healthy step.",
    };
  }
}

/**
 * Modify the length of a suggested reply while preserving tone and intent
 * @param originalReply The original reply text
 * @param action Whether to shorten or lengthen
 * @param intention The relationship direction
 * @returns Modified reply text
 */
export async function modifyReplyLength(
  originalReply: string,
  action: "shorten" | "lengthen",
  intention: "improve" | "distance" | "maintain" | "clarity"
): Promise<string> {
  const client = getOpenAIClient();

  const actionInstructions = {
    shorten:
      "Make this reply SHORTER and more concise while keeping the same mature, self-respecting tone. Remove unnecessary words but maintain clarity. Aim for about 50-70% of the original length.",
    lengthen:
      "Make this reply LONGER with more measured context while keeping the same mature, self-respecting tone. Add nuance without over-explaining. Aim for about 130-150% of the original length.",
  };

  const intentionContext = {
    improve:
      "This is for improving the relationship — keep it warm but grounded, open from a place of security.",
    distance:
      "This is for creating space — keep it clear and boundaried without being cold or defensive.",
    maintain:
      "This is for maintaining equilibrium — keep it steady and self-possessed.",
    clarity:
      "This is for gaining understanding — keep it direct and curious without anxiety.",
  };

  const systemPrompt = `You are an expert at modifying message length while preserving emotional intelligence and quiet self-respect.

${actionInstructions[action]}

## VOICE REQUIREMENTS (MANDATORY)

### Core Tone: Mature, Emotionally Intelligent, Quiet Self-Respect
- Grounded and steady — not reactive or defensive
- Self-possessed — speaks from a place of knowing their own worth
- Unhurried — no need to over-explain or justify

### ABSOLUTE DO NOTs
- Sound defensive or reactive
- Over-explain or justify
- Apologize reflexively
- Sound pleading or anxious

Important:
- Keep the EXACT same mature, self-respecting tone
- Maintain the same relationship intention (${intention})
- ${intentionContext[intention]}
- Do NOT change the core message or meaning
- Keep natural, adult language
- Preserve any boundary-setting

Return ONLY the modified reply text, nothing else.`;

  const userPrompt = `Original reply:
"${originalReply}"

${action === "shorten" ? "Shorten" : "Lengthen"} this reply while keeping the same tone, intent, and emotional intelligence.`;

  try {
    console.log(`[modifyReplyLength] Action: ${action}, Intention: ${intention}`);
    console.log(`[modifyReplyLength] Original reply: "${originalReply}"`);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    const modifiedReply = completion.choices[0]?.message?.content?.trim();

    console.log(`[modifyReplyLength] Modified reply: "${modifiedReply}"`);

    if (!modifiedReply) {
      console.warn("No modified reply returned, using original");
      return originalReply;
    }

    // Remove quotes if the model wrapped the response
    const cleanedReply = modifiedReply.replace(/^["']|["']$/g, "");

    console.log(`[modifyReplyLength] Cleaned reply: "${cleanedReply}"`);

    return cleanedReply;
  } catch (error) {
    console.error(`Error modifying reply length (${action}):`, error);
    return originalReply; // Fallback to original
  }
}

/**
 * Personal Impact Analysis types
 */
export interface PersonalImpactAnalysis {
  emotionalImpact: string;
  mentalImpact: string;
  relationalImpact: string;
  behavioralImpact: string;
  communicationScore: number; // 0-100, higher = healthier communication
  scoreExplanation: string;
  reassuranceLine: string;
}

/**
 * Generate personal impact analysis for "How this affects me" expansion
 * Provides humanized, relatable insights about how the communication pattern may affect the user
 */
export async function generatePersonalImpactAnalysis(
  summary: string,
  patterns?: string[]
): Promise<PersonalImpactAnalysis> {
  const systemPrompt = `You are an emotionally intelligent AI that sounds like a thoughtful friend, not a therapist or authority.

Analyze how this communication pattern may affect someone personally. Provide humanized, relatable insights.

TONE RULES - CRITICAL:
- Use natural language with contractions ("you're," "that's," "it can feel like...")
- Acknowledge uncertainty
- Validate without diagnosing
- Never use clinical terms
- Never make moral judgments
- Never use commands ("you should")
- Avoid overly formal empathy scripts

Example of GOOD voice:
- "Stuff like this can really mess with your head over time — especially when you're trying to be reasonable and still feel confused."

Example of BAD voice (don't use):
- "This communication pattern can result in emotional distress."

RESPONSE FORMAT - provide JSON only:
{
  "emotionalImpact": "1-2 short sentences about emotional effects (confusion, self-doubt, anxiety, emotional fatigue). Neutral, validating, never accusatory.",
  "mentalImpact": "1-2 short sentences about mental effects (overthinking, second-guessing, feeling mentally drained). Relatable language.",
  "relationalImpact": "1-2 short sentences about relationship effects (imbalance, loss of trust, walking on eggshells). Grounded, not absolute.",
  "behavioralImpact": "1-2 short sentences about behavioral effects (people-pleasing, withdrawing, over-explaining). Human language.",
  "communicationScore": number (0-100, where 0 = very unhealthy communication, 100 = very healthy communication. Reflects the health of the communication the user is receiving. Be honest but not alarmist.),
  "scoreExplanation": "1 sentence explaining the score contextually. Example: 'This score reflects how healthy this type of communication tends to be — not a judgment, just a signal.'",
  "reassuranceLine": "1 grounding sentence. Examples: 'Your reaction makes sense.' / 'You're not overreacting for noticing this.' / 'It's okay to want clarity here.'"
}

SAFETY RULES:
- Never label anyone as "toxic" directly
- Never imply the user is weak for being affected
- Always frame as information, not instructions
- Emphasize user agency`;

  const patternsContext = patterns && patterns.length > 0
    ? `\nDetected patterns: ${patterns.join(", ")}`
    : "";

  const userPrompt = `Communication pattern observation: "${summary}"${patternsContext}

Generate a personal impact analysis explaining how this might affect someone. Return valid JSON only.`;

  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from API");
    }

    const parsed = JSON.parse(responseText);

    // Validate and clamp communication score
    const communicationScore = typeof parsed.communicationScore === "number"
      ? Math.min(100, Math.max(0, Math.round(parsed.communicationScore)))
      : 55;

    return {
      emotionalImpact: parsed.emotionalImpact || "This kind of exchange can leave you feeling unsure about your own reactions — like you're not quite sure if what you felt was valid.",
      mentalImpact: parsed.mentalImpact || "You might find yourself replaying the conversation, trying to figure out what went wrong or what you could have said differently.",
      relationalImpact: parsed.relationalImpact || "Over time, patterns like this can make it harder to feel at ease in the relationship — like you're always bracing for the next confusing moment.",
      behavioralImpact: parsed.behavioralImpact || "You might start adjusting how you express yourself, being extra careful or holding back to avoid another uncomfortable exchange.",
      communicationScore,
      scoreExplanation: parsed.scoreExplanation || "This score reflects how healthy this type of communication tends to be — not a judgment, just a signal.",
      reassuranceLine: parsed.reassuranceLine || "Your reaction makes sense.",
    };
  } catch (error) {
    console.error("[generatePersonalImpactAnalysis] Error:", error);

    return {
      emotionalImpact: "This kind of exchange can leave you feeling unsure about your own reactions — like you're not quite sure if what you felt was valid.",
      mentalImpact: "You might find yourself replaying the conversation, trying to figure out what went wrong or what you could have said differently.",
      relationalImpact: "Over time, patterns like this can make it harder to feel at ease in the relationship — like you're always bracing for the next confusing moment.",
      behavioralImpact: "You might start adjusting how you express yourself, being extra careful or holding back to avoid another uncomfortable exchange.",
      communicationScore: 55,
      scoreExplanation: "This score reflects how healthy this type of communication tends to be — not a judgment, just a signal.",
      reassuranceLine: "Your reaction makes sense.",
    };
  }
}

/**
 * Detect potential boundary concerns in user-submitted text or conversation
 * Returns boundary analysis only if concerns are detected with reasonable confidence
 * Does NOT trigger for normal conflict, healthy disagreement, or neutral miscommunication
 */
export async function detectBoundaryConcerns(
  userMessage: string,
  conversationContext?: string
): Promise<{ detected: boolean; analysis: BoundaryAnalysis | null }> {
  const systemPrompt = `You are an emotionally intelligent AI specializing in communication patterns and relationship dynamics.

Analyze the provided text for potential BOUNDARY concerns. Surface a boundary insight ONLY if you detect one or more of the following with reasonable confidence:

TRIGGER CONDITIONS (must detect at least one):
- Repeated disregard for the user's expressed needs, limits, or comfort
- Guilt-inducing language, pressure, or emotional manipulation
- Invasion of personal time, space, privacy, or autonomy
- One-sided emotional labor or expectations
- Escalation after the user attempts to de-escalate
- The user expressing confusion, discomfort, self-doubt, or obligation rather than choice

DO NOT TRIGGER for:
- Normal conflict or healthy disagreement
- Neutral miscommunication
- Simple misunderstandings
- One-time frustrations without pattern

TONE RULES (if triggered):
- Never label the other person as "toxic," "bad," or "wrong"
- Avoid alarmist language
- Frame observations as patterns, not accusations
- Center the user's experience, not the other person's intent
- Maintain calm, emotionally intelligent neutrality

If boundary concerns are detected, respond with JSON:
{
  "detected": true,
  "confidence": "high" | "medium" | "low",
  "primaryMessage": "A gentle, observational summary (1-2 lines). Example: 'Some parts of this interaction suggest your needs or limits may not be fully respected.'",
  "detectedSignals": ["Brief neutral highlight 1", "Brief neutral highlight 2"] (max 2, no quotes unless necessary),
  "supportiveNote": "Reinforce user agency and emotional safety. Example: 'This does not mean you are doing anything wrong — it may simply be a moment worth pausing and reflecting on.'"
}

If NO boundary concerns detected (confidence too low or not applicable), respond with:
{
  "detected": false,
  "confidence": "none",
  "reason": "Brief reason why no boundary concern was flagged"
}

Return valid JSON only.`;

  const userPrompt = conversationContext
    ? `Context: ${conversationContext}\n\nCurrent message to analyze: ${userMessage}`
    : `Message to analyze: ${userMessage}`;

  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.log("[detectBoundaryConcerns] No response from API");
      return { detected: false, analysis: null };
    }

    const parsed = JSON.parse(responseText);

    // Only return analysis if detected AND confidence is not low
    if (parsed.detected === true && parsed.confidence !== "low") {
      console.log("[detectBoundaryConcerns] Boundary concern detected:", parsed.confidence);
      return {
        detected: true,
        analysis: {
          primaryMessage: parsed.primaryMessage || "Some parts of this interaction suggest your needs or limits may not be fully respected.",
          detectedSignals: Array.isArray(parsed.detectedSignals) ? parsed.detectedSignals.slice(0, 2) : undefined,
          supportiveNote: parsed.supportiveNote || "This does not mean you are doing anything wrong — it may simply be a moment worth pausing and reflecting on.",
        },
      };
    }

    console.log("[detectBoundaryConcerns] No boundary concern detected:", parsed.reason);
    return { detected: false, analysis: null };
  } catch (error) {
    console.error("[detectBoundaryConcerns] Error:", error);
    return { detected: false, analysis: null };
  }
}

/**
 * Generate boundary clarity summary when user taps "Understand My Boundaries Better"
 * Provides educational insight into what boundary was crossed, how it impacts them, and the relationship
 */
export async function generateBoundaryClarity(
  boundaryAnalysis: BoundaryAnalysis,
  originalMessage?: string
): Promise<{
  whatBoundaryCrossed: string;
  howItImpactsYou: string;
  howItAffectsRelationship: string;
  transitionLine: string;
}> {
  const systemPrompt = `You are an emotionally intelligent AI specializing in boundary awareness and relationship dynamics.

The user has asked to understand their boundaries better after a potential boundary concern was detected. Generate a calm, grounded, educational response in THREE parts:

**Part 1: What Boundary May Have Been Crossed** (2-3 sentences)
- Name the boundary category neutrally (e.g., emotional availability, personal time, autonomy, respect for decisions)
- Explain briefly what this boundary means in relationships
- Keep it educational, not accusatory

**Part 2: How This Might Impact You** (2-3 sentences)
- Describe the internal emotional experience when this boundary is crossed
- Help them understand why they may feel confused, drained, or uneasy
- Normalize the feeling

**Part 3: How This Could Affect the Relationship** (2-3 sentences)
- Explain the potential long-term dynamic if this pattern continues
- Keep it balanced — not fear-based, but awareness-focused
- Frame as something worth noticing, not a verdict

Also provide a brief **Transition Line** (1 sentence) that gently bridges to choosing their relationship direction:
- Example: "Now that you have more clarity, you can choose how you want to move forward."

TONE:
- Calm, grounded, emotionally intelligent
- Educational without lecturing
- Supportive of autonomy
- No labels like "toxic" or "bad"
- Center the user's experience

Return valid JSON only:
{
  "whatBoundaryCrossed": "string (2-3 sentences)",
  "howItImpactsYou": "string (2-3 sentences)",
  "howItAffectsRelationship": "string (2-3 sentences)",
  "transitionLine": "string (1 sentence)"
}`;

  const userPrompt = `Boundary analysis detected:
- Primary message: ${boundaryAnalysis.primaryMessage}
- Detected signals: ${boundaryAnalysis.detectedSignals?.join("; ") || "General boundary concern"}
- Supportive note: ${boundaryAnalysis.supportiveNote || "N/A"}
${originalMessage ? `\nOriginal situation: ${originalMessage}` : ""}

Generate a boundary clarity summary to help the user understand their boundaries better. Return valid JSON only.`;

  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from API");
    }

    const parsed = JSON.parse(responseText);

    return {
      whatBoundaryCrossed:
        parsed.whatBoundaryCrossed ||
        "This situation may involve a boundary around emotional availability or respect for your expressed needs.",
      howItImpactsYou:
        parsed.howItImpactsYou ||
        "When this boundary is crossed, you might feel drained, confused, or like your needs are not being heard. This is a normal response to feeling unseen.",
      howItAffectsRelationship:
        parsed.howItAffectsRelationship ||
        "Over time, unaddressed boundary patterns can create distance, resentment, or emotional exhaustion. Noticing this now gives you a chance to address it intentionally.",
      transitionLine:
        parsed.transitionLine ||
        "Now that you have more clarity, you can choose how you want to move forward.",
    };
  } catch (error) {
    console.error("[generateBoundaryClarity] Error:", error);

    return {
      whatBoundaryCrossed:
        "This situation may involve a boundary around emotional availability or respect for your expressed needs. Boundaries are the limits we set to protect our well-being and maintain healthy relationships.",
      howItImpactsYou:
        "When this boundary is crossed, you might feel drained, confused, or like your needs are not being heard. This is a normal response to feeling unseen or pressured.",
      howItAffectsRelationship:
        "Over time, unaddressed boundary patterns can create emotional distance or resentment. Recognizing this early gives you the opportunity to address it intentionally.",
      transitionLine:
        "Now that you have more clarity, you can choose how you want to move forward.",
    };
  }
}

/**
 * Red Flags Analysis types
 */
export interface RedFlagsAnalysis {
  detected: boolean;
  introText: string;
  flags: { text: string }[];
}

/**
 * Detect potential red flags in communication
 * Returns red flags only when clear or potential signals are detected
 * Tone is calm, neutral, non-judgmental — like a thoughtful friend pointing something out
 */
export async function detectRedFlags(
  userMessage: string,
  patterns?: string[]
): Promise<RedFlagsAnalysis> {
  const systemPrompt = `You are an emotionally intelligent AI that helps people notice communication patterns. Your tone is calm, neutral, and supportive — like a thoughtful friend pointing something out, not a warning system.

TASK: Analyze the provided text for potential red flags in communication. Only surface flags when there are CLEAR or POTENTIAL signals worth noticing.

WHAT COUNTS AS A RED FLAG:
- Dismissing or invalidating feelings
- Shifting blame or refusing accountability
- Inconsistency between words and actions
- Pressure tactics or guilt-tripping
- Withholding information or stonewalling
- Patterns of deflection or avoidance
- One-sided expectations or emotional labor
- Subtle put-downs or condescension
- Love-bombing followed by withdrawal
- Making someone question their reality

DO NOT FLAG:
- Normal disagreements
- Simple misunderstandings
- One-time frustrations
- Healthy boundary-setting by either party
- Direct but respectful communication

TONE RULES - CRITICAL:
- Never tell the user what to do
- Never label the other person as "toxic," "abusive," or "bad"
- Avoid triggering or alarming language
- Frame flags as patterns or signals, not diagnoses
- Use neutral, observational language
- No absolutes (never say "always" or "never" about someone)
- Keep it calm and grounded

RESPONSE FORMAT - provide JSON only:
{
  "detected": boolean (true if at least one clear or potential red flag exists),
  "introText": "A short, calm intro sentence (1 sentence). Example: 'Here are a few things worth noticing — not conclusions, just signals.'",
  "flags": [
    { "text": "Neutral description of the pattern or signal (1-2 sentences max)" }
  ] (2-4 items max, only include if detected is true)
}

If no red flags detected, return:
{
  "detected": false,
  "introText": "",
  "flags": []
}`;

  const patternsContext = patterns && patterns.length > 0
    ? `\nDetected communication patterns: ${patterns.join(", ")}`
    : "";

  const userPrompt = `Analyze this message for potential red flags:

"${userMessage}"${patternsContext}

Return valid JSON only.`;

  try {
    // Use fast model for red flags detection - it's a pattern recognition task
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      600,
      true
    );

    const parsed = JSON.parse(response);

    if (parsed.detected === true && Array.isArray(parsed.flags) && parsed.flags.length > 0) {
      return {
        detected: true,
        introText: parsed.introText || "Here are a few things worth noticing — not conclusions, just signals.",
        flags: parsed.flags.slice(0, 4).map((f: any) => ({
          text: typeof f.text === "string" ? f.text : String(f),
        })),
      };
    }

    return { detected: false, introText: "", flags: [] };
  } catch (error) {
    return { detected: false, introText: "", flags: [] };
  }
}

/**
 * Clarification Analysis types
 */
export interface ClarificationAnalysis {
  needsClarification: boolean;
  clarificationQuestion: string;
  clarificationType: "moment" | "person" | "goal" | "thread" | "emotional" | null;
}

/**
 * Klarity Clarification Mode
 * Checks if user input needs clarification before generating replies
 * Helps users slow down, focus, and get specific — gently
 */
export async function checkNeedsClarification(
  userMessage: string
): Promise<ClarificationAnalysis> {
  const systemPrompt = `You are Klarity in Clarification Mode.

Your job is to determine if the user's input is clear enough to generate a helpful reply suggestion, or if clarification is needed first.

## WHAT MAKES INPUT CLEAR?
At least ONE of these should be identifiable:
- What happened (the specific moment or exchange)
- Who it's with (the person involved)
- What outcome the user wants

## WHAT MAKES INPUT UNCLEAR?
- Purely emotional venting with no specific situation
- Multiple tangled situations without focus
- Missing context about what was said or done
- No clear person or relationship identified
- Rambling without a specific moment to address

## IF CLARIFICATION IS NEEDED
Ask ONE focused question. Choose the most helpful:

1. Focus the Moment: "What actually happened in the moment you want help with?"
2. Identify the Person: "Who is this with, and what did they say or do?"
3. Define the Goal: "What outcome are you hoping for here?"
4. Separate Threads: "Which part of this do you want to handle first?"
5. Purely Emotional: "That's understandable. What's the last thing that was said or done?"

## VOICE REQUIREMENTS
- Calm, grounded, human
- Reassuring but not emotional
- Efficient and respectful
- Plain, everyday language
- Short responses
- One question only

## GENTLE FRAMING
Use phrases like:
- "Let's slow this down for a second."
- "I want to make sure I understand."
- "We can take this one step at a time."

## DO NOTs
- Do NOT give advice or reply suggestions
- Do NOT label emotions or behavior
- Do NOT diagnose or therapize
- Do NOT ask multiple questions
- Do NOT rephrase the situation for the user

Respond with valid JSON only:
{
  "needsClarification": boolean (true if input is unclear),
  "clarificationQuestion": "string (the ONE question to ask, or empty if clear)",
  "clarificationType": "moment" | "person" | "goal" | "thread" | "emotional" | null
}`;

  const userPrompt = `Evaluate if this input needs clarification before I can help with a reply:

"${userMessage}"

Return valid JSON only.`;

  try {
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      1000,
      true
    );

    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      needsClarification: parsed.needsClarification === true,
      clarificationQuestion: parsed.clarificationQuestion || "",
      clarificationType: parsed.clarificationType || null,
    };
  } catch (error) {
    console.error("[checkNeedsClarification] Error:", error);
    // Default to not needing clarification on error
    return {
      needsClarification: false,
      clarificationQuestion: "",
      clarificationType: null,
    };
  }
}

/**
 * Generate a clarification response for the user
 * Used when input is unclear and we need more information
 */
export async function generateClarificationResponse(
  userMessage: string,
  attemptCount: number = 1
): Promise<string> {
  // After 2-3 attempts, offer structure instead of questions
  if (attemptCount >= 3) {
    return "If it helps, you can answer just one:\n• What was said\n• What you want to say back\n• Or what outcome you want";
  }

  const systemPrompt = `You are Klarity in Clarification Mode.

Your job is to help the user clarify their situation. Their input is unclear, incomplete, or emotionally overloaded.

## VOICE
- Calm, grounded, human
- Reassuring but not emotional
- Efficient and respectful
- You sound like someone helping organize thoughts, not process feelings

## RESPONSE FORMAT
1. Light acknowledgment (1 short sentence)
2. ONE focused question

## QUESTION OPTIONS (pick ONE)
- "What actually happened in the moment you want help with?"
- "Who is this with, and what did they say or do?"
- "What outcome are you hoping for here?"
- "Which part of this do you want to handle first?"

For purely emotional input with no situation:
- "That's understandable. What's the last thing that was said or done?"

## DO NOTs
- Do NOT give advice
- Do NOT label emotions
- Do NOT ask multiple questions
- Do NOT rephrase their situation
- Do NOT push forward prematurely

Keep the response SHORT (2-3 sentences max).`;

  const userPrompt = `The user said: "${userMessage}"

Generate a brief, gentle clarification response. Keep it short.`;

  try {
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      500,
      false
    );

    return stripMarkdown(response.trim()) || "I want to make sure I understand. What actually happened in the moment you want help with?";
  } catch (error) {
    console.error("[generateClarificationResponse] Error:", error);
    return "I want to make sure I understand. What actually happened in the moment you want help with?";
  }
}

/**
 * Analyze an additional image mid-loop as a continuation of the existing conversation
 * Treats the new image in context of everything already discussed
 */
export async function analyzeImageContinuation(
  imageBase64: string,
  conversationContext: {
    originalMessage: string;
    previousSummary: string;
    previousPatterns?: string[];
    previousReply?: string;
  }
): Promise<{
  continuationSummary: string;
  whatChanged: string;
  updatedReply: { id: string; text: string; guidanceNote: string };
  approachShift?: string;
}> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity — a personal communication calibrator analyzing a NEW message screenshot that continues an existing conversation the user is already discussing.

## CONTEXT
The user has already shared a situation with you. Now they are adding a NEW screenshot showing an additional message in the same conversation. Your job is to:

1. Analyze the new message IN CONTEXT of everything already discussed
2. Briefly acknowledge what has changed or escalated (if anything)
3. Generate ONE updated reply suggestion that DIRECTLY RESPONDS to the new message

## CRITICAL INSTRUCTION

The reply you generate should DIRECTLY RESPOND to the LAST MESSAGE shown in the screenshot. Not a generic response — an actual reply to what was said.

## IMPORTANT
- Do NOT re-explain the full situation
- Do NOT start from scratch
- Keep the response concise, calm, and practical
- Assume the user wants to keep momentum, not start over
- If the new message contradicts or complicates the prior approach, gently adjust and explain the shift in ONE short sentence

## VOICE REQUIREMENTS

- Natural, conversational language — like a real person texting
- Match the formality and energy of the conversation
- Warm and human, not stiff or clinical
- Uses contractions naturally

## MATCH THE ENERGY

- If they are being warm → respond warmly
- If they asked a question → address it
- If they shared something → acknowledge it genuinely
- Respond to what they ACTUALLY said

## ABSOLUTE DO NOTs
- Generate generic template responses that ignore what was said
- Sound defensive when the situation does not call for it
- Over-explain or justify
- Sound like a therapy script

## GUIDANCE NOTE RULES (CRITICAL)
- The guidance note is about how the RECIPIENT will FEEL emotionally
- Good examples: "This will make them feel heard", "This might ease the tension", "This shows you care"
- BAD (never write these): "This responds directly to...", "This addresses the last message", "This directly responds to what they said"
- The guidance note should NEVER reference "the last message", "the conversation", or describe what the reply does

Respond with valid JSON only:
{
  "continuationSummary": "1-2 sentences briefly summarizing what the new message adds to the situation",
  "whatChanged": "1 sentence noting any escalation, de-escalation, or shift in dynamic (or 'The conversation continues along the same lines' if no major change)",
  "updatedReply": {
    "id": "string",
    "text": "the updated suggested reply (1-3 sentences) — actually responding to what they said",
    "guidanceNote": "the recipient's emotional reaction (e.g. 'This will make them feel valued')"
  },
  "approachShift": "optional — only include if the new message requires adjusting the previous approach, explain in 1 sentence"
}`;

  const userPrompt = `## EXISTING CONTEXT
Original situation: ${conversationContext.originalMessage}

Previous analysis summary: ${conversationContext.previousSummary}
${conversationContext.previousPatterns ? `Previous patterns detected: ${conversationContext.previousPatterns.join(", ")}` : ""}
${conversationContext.previousReply ? `Previous suggested reply: "${conversationContext.previousReply}"` : ""}

## NEW IMAGE
Analyze this new screenshot as a CONTINUATION of the above conversation. Do not restart the analysis — build on what we already know.`;

  try {
    console.log("[analyzeImageContinuation] Starting continuation analysis");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      throw new Error("Empty response from API");
    }

    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    console.log("[analyzeImageContinuation] Analysis complete");

    return {
      continuationSummary: parsed.continuationSummary || "The conversation continues with a new message.",
      whatChanged: parsed.whatChanged || "The conversation continues along the same lines.",
      updatedReply: {
        id: Date.now().toString(),
        text: parsed.updatedReply?.text || "Thanks for the update. Let me think about that.",
        guidanceNote: parsed.updatedReply?.guidanceNote || "Stay grounded and respond when you are ready.",
      },
      approachShift: parsed.approachShift,
    };
  } catch (error: any) {
    console.error("[analyzeImageContinuation] Error:", error?.message || error);

    return {
      continuationSummary: "A new message has been added to the conversation.",
      whatChanged: "The conversation continues.",
      updatedReply: {
        id: Date.now().toString(),
        text: "Let me take a moment to think about this.",
        guidanceNote: "Take your time — a thoughtful response is more valuable than a quick one.",
      },
    };
  }
}

/**
 * Generate a polished rewrite of the user's intended reply
 * Preserves the user's intent but improves clarity, boundaries, and emotional intelligence
 * Used in Rewrite mode - skips analysis, just provides one polished reply
 */
export async function generateRewriteReply(
  userIntendedReply: string
): Promise<{ rewrittenReply: string; originalIntent: string }> {
  const systemPrompt = `You are Klarity — a personal communication calibrator.

Your job is to REWRITE the user's intended reply to make it clearer and more polished — while preserving their original intent and tone.

## PRIMARY OBJECTIVE
Take what the user wants to say and make it sound like the most composed version of themselves. Keep their voice and intent intact.

The rewritten reply should:
- Preserve the user's original intent and message EXACTLY
- Improve clarity and flow
- Sound natural and human — like how they would text
- NOT change the emotional tone they chose

## VOICE REQUIREMENTS

- Natural, conversational language
- Match the tone the user set (warm, direct, casual, etc.)
- Uses contractions naturally
- Sounds like a real person

## ABSOLUTE DO NOTs
- Do NOT change the core message or what the user wants to communicate
- Do NOT add boundaries or "self-respect" language they did not include
- Do NOT make it more defensive than they intended
- Do NOT add therapy-speak
- Do NOT change warm messages into guarded ones
- Do NOT over-explain or add justifications they did not include
- Sound stiff or formal if they were casual

## EXAMPLES

User wants to say: "yeah that sounds fun, when were you thinking?"
Good rewrite: "Yeah, that sounds fun! When were you thinking?"
Bad rewrite: "I appreciate you thinking of me. I am open to that. What timing works?"

User wants to say: "im not sure about that tbh"
Good rewrite: "I'm not sure about that, to be honest."
Bad rewrite: "I need to be honest with you — that does not feel right for me."

User wants to say: "can we talk later? im busy rn"
Good rewrite: "Can we talk later? I'm busy right now."
Bad rewrite: "I hear you. I am not available to discuss this at the moment."

## QUALITY CHECK
The rewritten reply should:
1. Say the SAME thing the user wanted to say
2. Sound like them, just polished
3. NOT add meaning or tone they did not include

Respond with valid JSON only:
{
  "rewrittenReply": "string (the polished reply — ready to send as-is, 1-4 sentences)",
  "originalIntent": "string (1 sentence summary of what the user was trying to communicate)"
}`;

  const userPrompt = `The user wants to reply with: "${userIntendedReply}"

Polish this while keeping their intent and tone intact.`;

  try {
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      1500,
      true
    );

    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      rewrittenReply: parsed.rewrittenReply || userIntendedReply,
      originalIntent: parsed.originalIntent || "Express your thoughts clearly",
    };
  } catch (error) {
    console.error("[generateRewriteReply] Error:", error);
    return {
      rewrittenReply: userIntendedReply,
      originalIntent: "Express your thoughts clearly",
    };
  }
}

/**
 * Add emojis to a reply text intelligently
 * Analyzes the tone and content of the reply to place appropriate emojis naturally
 * Returns the reply with emojis integrated (not just appended)
 */
export async function addEmojisToReply(replyText: string): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = `You are an expert at adding emojis to text messages naturally and appropriately.

Your job is to take a reply message and add emojis that:
1. Match the emotional tone and intent of the message
2. Feel natural and conversational — like how a real person would text
3. Are placed appropriately within the text or at the end
4. Enhance the message without overwhelming it

## RULES

### Emoji Quantity
- For short messages (1 sentence): 1-2 emojis max
- For medium messages (2-3 sentences): 2-3 emojis max
- Never overdo it — less is more
- Some messages work better with NO emojis at end, just integrated ones

### Emoji Placement
- Can be at the end of the full message
- Can be at the end of a specific sentence for emphasis
- Can replace words naturally (e.g., "love" could have ❤️ after it)
- Should feel organic, not forced

### Tone Matching
- Warm/friendly messages: 😊 🥰 💕 ✨
- Understanding/supportive: 💙 🙏 💪
- Lighthearted: 😂 😅 🤗
- Thoughtful/reflective: 💭 🤔 ✨
- Appreciative: 🙏 💕 ❤️
- Boundaries/firm but kind: Keep minimal or use softening ones like 💙

### DO NOTs
- Don't add emojis that change the meaning
- Don't add too many (looks immature or insincere)
- Don't use emojis that conflict with the tone (no 😂 in serious messages)
- Don't use emojis that could be misread as passive-aggressive
- Don't add emojis to every sentence

Return ONLY the modified text with emojis added. Nothing else.`;

  const userPrompt = `Add appropriate emojis to this reply:

"${replyText}"

Return only the text with emojis naturally integrated.`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      console.warn("[addEmojisToReply] No result, returning original");
      return replyText;
    }

    // Remove any quotes if the model wrapped the response
    const cleanedResult = result.replace(/^["']|["']$/g, "");

    console.log("[addEmojisToReply] Original:", replyText);
    console.log("[addEmojisToReply] With emojis:", cleanedResult);

    return cleanedResult;
  } catch (error) {
    console.error("[addEmojisToReply] Error:", error);
    return replyText;
  }
}

/**
 * Build a context summary from conversation history for better continuity
 * Extracts key facts: names, relationships, situations, and prior insights
 */
function buildContextSummary(
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): string | null {
  if (conversationHistory.length === 0) return null;

  const keyDetails: string[] = [];

  // Extract key information from user messages
  for (const msg of conversationHistory) {
    if (msg.role === "user") {
      // Look for names (capitalized words that might be names)
      const nameMatches = msg.content.match(/\b[A-Z][a-z]+\b/g);
      if (nameMatches) {
        const potentialNames = nameMatches.filter(
          (name) => !["I", "The", "This", "That", "What", "When", "Where", "Why", "How", "My", "He", "She", "They", "It"].includes(name)
        );
        if (potentialNames.length > 0) {
          keyDetails.push(`Names mentioned: ${[...new Set(potentialNames)].join(", ")}`);
        }
      }

      // Check for relationship keywords
      const relationshipKeywords = ["boyfriend", "girlfriend", "partner", "husband", "wife", "friend", "coworker", "boss", "ex", "mom", "dad", "brother", "sister", "family"];
      for (const keyword of relationshipKeywords) {
        if (msg.content.toLowerCase().includes(keyword)) {
          keyDetails.push(`Relationship context: ${keyword} mentioned`);
          break;
        }
      }
    }

    // Extract search result context
    if (msg.content.includes("[Search Results for")) {
      keyDetails.push("Deep search was performed - user has verified profile information");
    }
  }

  // Get the first user message as the original situation
  const firstUserMsg = conversationHistory.find((m) => m.role === "user");
  if (firstUserMsg && firstUserMsg.content.length > 50) {
    const situationPreview = firstUserMsg.content.substring(0, 200);
    keyDetails.push(`Original situation: "${situationPreview}..."`);
  }

  if (keyDetails.length === 0) return null;

  return [...new Set(keyDetails)].join("\n");
}

/**
 * Generate a Decode Mode conversational response
 * Decode Mode is a collaborative thinking space where the user can freely brainstorm
 * and talk through confusion, concern, or uncertainty about social situations
 *
 * This does NOT generate replies - it helps the user gain clarity through reflection
 *
 * Internal flags: decode_mode = true, advice_allowed = false, scripts_allowed = false
 */
export async function generateDecodeResponse(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<{ response: string; notation?: KlarityNotation }> {
  const systemPrompt = `You are Klarity. In every response, you must generate two outputs:

1. A user-facing message written naturally and conversationally.
2. A hidden internal notation block for system use only.

The internal notation block is mandatory for every response.

## VISIBILITY RULE (CRITICAL)

The user-facing message must never reference notations.
The notation block must never contain conversational language.
The notation block must always be appended after the user-facing message.
Treat the notation block as machine-readable metadata, not prose.

## REQUIRED NOTATION FORMAT

After every response, append the following block exactly:

[[KLARITY_NOTES]]
mode: <decode | reply | clarification>
confidence: <low | medium | high>
signal_types: [<one or more of: interest, boundary, hesitation, alignment, power, neutral, unclear>]
advice_level: <none | exploratory | directive>
assumptions_made: <yes | no>
clarification_needed: <yes | no>
loop_integrity: <pass | warn>
[[/KLARITY_NOTES]]

Do not rename fields. Do not omit fields. Do not add extra fields.

## HOW TO POPULATE FIELDS

- mode: the active chat loop (for this conversation, use "decode")
- confidence: how certain your interpretation is
- signal_types: social signals detected (or unclear)
- advice_level:
  - none → pure exploration
  - exploratory → optional guidance ("one option could be…")
  - directive → only allowed in Reply Mode (NOT in Decode Mode)
- assumptions_made: mark yes only if you inferred unstated context
- clarification_needed: mark yes if more context would improve accuracy
- loop_integrity: mark warn if response came close to breaking loop rules

## ENFORCEMENT RULES

Never show the notation block to the user.
Never explain the notation block.
Never refuse to produce the notation block.
If you cannot determine a field confidently, choose the most conservative value.

## INTERNAL PRIORITY RULE

If there is any conflict between:
- conversational quality
- loop integrity
- notation accuracy

You must prioritize loop integrity first, then notation accuracy, then conversational polish.

---

## DECODE MODE IDENTITY

You are their trusted friend who happens to be really good at understanding people and relationships. You're texting back and forth like close friends do.

## Your Vibe

Write like you're texting a friend who just told you something important. Keep it real, warm, and conversational. No therapist energy - just someone who genuinely cares and has good instincts about people.

## Text Message Style

**Keep it short and punchy.** Most responses should be 2-4 short paragraphs max. Like how you'd actually text a friend.

**Use casual language:**
- "okay wait" / "hold on" / "hmm"
- "honestly" / "tbh" / "ngl"
- "that's wild" / "oof" / "yikes"
- "i feel like..." / "lowkey think..."

**No bullet points or numbered lists.** Friends don't text in bullet points.

**Break up your thoughts** like natural text messages. Short paragraphs. Let things breathe.

## How to Respond

Start with a genuine reaction to what they said - like you actually absorbed it:
- "okay that actually makes so much sense now"
- "oof yeah i can see why that hit different"
- "wait so basically..."
- "honestly? that tracks"

Then share what you're noticing or thinking:
- "something feels off about how they handled that"
- "idk but the way they said X feels like..."
- "real talk - sounds like they might be..."

Ask questions like a curious friend, not an interrogator:
- "has this happened before with them?"
- "what's your gut telling you?"
- "how'd that make you feel in the moment?"

## What NOT to Do

- Don't sound like a therapist or life coach
- Don't use words like "boundaries", "validate", "communicate", "self-care"
- Don't give generic advice like "just be yourself" or "communication is key"
- Don't lecture or be preachy
- Don't use formal structure or headers
- Don't start every response with "I"
- Don't be overly positive or sugarcoat things - be honest like a real friend would

## Stay on Topic

You're here for the relationship/social stuff. If they go off topic, bring it back casually: "haha okay but back to the main thing..."

## Examples of Good Responses

"okay wait that's actually kind of a red flag though? like the fact that they only reach out when it's convenient for them... idk it just feels one-sided. has it always been like this or is this new?"

"oof yeah that's frustrating. sounds like you've been putting in way more effort than they have and now it's catching up to you. what do you wanna do about it?"

"honestly i think your gut is right here. something about how they responded feels off - like they're deflecting instead of actually addressing what you said"

## CONTEXT CONTINUITY (CRITICAL)

Remember everything from the conversation. Reference specific names, details, and situations they mentioned. If they ask a follow-up, you already know what they're talking about - don't ask them to repeat themselves.`;

  // Build context-aware messages with conversation summary for long chats
  const messages: GPT5Message[] = [{ role: "system", content: systemPrompt }];

  // If conversation is getting long, add a context summary at the start
  if (conversationHistory.length > 6) {
    const contextSummary = buildContextSummary(conversationHistory);
    if (contextSummary) {
      messages.push({
        role: "system",
        content: `[CONVERSATION CONTEXT SUMMARY]\n${contextSummary}\n[END SUMMARY - Use this to maintain continuity]`,
      });
    }
  }

  // Add conversation history
  messages.push(
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }))
  );

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  try {
    // Use lower temperature (0.7) for more consistent, focused decode responses
    const rawResponse = await callGPT5Mini(messages, 2500, false, 0.7);

    // Parse the response to extract user-facing content and internal notation
    const { userResponse, notation } = parseKlarityNotation(rawResponse);

    // Log notation for internal tracking/debugging
    if (notation) {
      console.log("[generateDecodeResponse] Klarity Notation:", JSON.stringify(notation, null, 2));
    }

    // Apply subtle emoji integration to decode responses
    // Emojis are added only to specific parts (insights, guidance, context acknowledgment)
    const responseWithEmoji = processDecodeResponseWithEmoji(userResponse);

    return {
      response: responseWithEmoji,
      notation: notation || undefined,
    };
  } catch (error) {
    console.error("[generateDecodeResponse] Error:", error);
    return {
      response: "I want to make sure I understand what is going on here. What part of this situation feels most confusing or unclear to you?",
      notation: {
        mode: "decode",
        confidence: "low",
        signal_types: ["unclear"],
        advice_level: "none",
        assumptions_made: "no",
        clarification_needed: "yes",
        loop_integrity: "pass",
      },
    };
  }
}

/**
 * Generate a decode response with streaming support
 * Calls onStream with each chunk of text as it arrives
 */
export async function generateDecodeResponseStreaming(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
  onStream: StreamCallback
): Promise<{ response: string; notation?: KlarityNotation }> {
  console.log("[generateDecodeResponseStreaming] Called with:", {
    userMessageLength: userMessage?.length,
    historyLength: conversationHistory?.length,
    hasOnStream: !!onStream,
  });
  const systemPrompt = `You're a sharp friend with good instincts about people. You text like a real person.

## Your Vibe

Short. Direct. Strategic. You care but you're not soft about it. You see patterns others miss.

## Text Style

2-4 short paragraphs max. No bullet points. No lists. Break thoughts into short chunks like real texts.

Casual: "okay wait", "hmm", "honestly", "tbh", "lowkey think...", "something's off here"

NEVER use markdown: no **bold**, no _underscores_, no *italics*, no # headers — plain text only.

## How to Respond

Quick reaction first:
"okay that tracks"
"wait hold on"
"hmm interesting"

Then what you notice. Keep it tight.

## COLLABORATIVE CALIBRATION

If the user seems emotionally escalated, assumption-heavy, or jumping to conclusions without clear evidence:

1. Light acknowledgment: "I get why that landed weird"
2. Alternative angle: "could also be..." (don't invalidate, expand)
3. Quick comparison: One sentence. "First read says X. But Y is possible too."
4. Strategic move: Test clarity rather than react.

Examples:

USER: "They're clearly manipulating me"
GOOD: "I see why it reads that way. Could also be avoidance rather than calculation. Worth testing with a direct question."

USER: "This proves they don't care"
GOOD: "That's one read. Another: checked out on this topic, not on you. Different problem, different move."

## SELF-IMPACT AWARENESS (CRITICAL)

If the user's behavior shows imbalance - over-investing, over-texting, chasing reassurance, emotional escalation, over-apologizing:

1. Neutral pattern observation: "There's a slight effort imbalance here" or "You're carrying more of the emotional weight"

2. Strategic consequence (short, analytical): Explain how this could shift perceived value or create unintended pressure. One sentence max.

3. Self-respect reframe: "Protecting your pace preserves balance" or "Your time has the same value"

4. Calm adjustment: "Consider slowing the tempo and observing their response"

RULES:
- No shame or blame
- No moral judgment
- No therapy tone
- No emotional reassurance
- Keep it composed and strategic
- User should feel sharpened, not criticized

Examples:

USER: "I've sent 3 messages and they haven't responded so I sent another one asking if everything's okay"
BAD: "You shouldn't double text, that looks needy"
GOOD: "That's 4 messages to their 0. Not saying anything's wrong, but the ratio shifts how you're positioned. Might be worth letting them close the gap before you add more."

USER: "I apologized again just to make sure they're not upset"
BAD: "Stop apologizing so much, it's not healthy"
GOOD: "Second apology when they haven't asked for one. This can accidentally signal that you think you did something wrong - even if you didn't. Let them respond to the first one."

USER: "I really need them to tell me we're okay"
BAD: "You shouldn't need validation from them"
GOOD: "Seeking confirmation before they've given a reason to worry. If you ask now, you're handing them the frame. Better to observe their next move and let that answer it."

USER: "I keep checking if they've seen my message"
BAD: "That's anxious behavior, try to relax"
GOOD: "Monitoring mode. Understandable but it puts you in a reactive position. The play is usually to match their energy - if they're slow, you're slower."

## What NOT to Do

No therapist words: boundaries, validate, communicate, self-care, processing, anxious attachment
No lectures. No preachy tone. No generic advice.
Don't automatically agree with escalated interpretations.
Don't over-validate emotions.
Don't shame or criticize patterns - reframe strategically.

## Context Continuity

Remember everything. Reference names and details they mentioned. You already know what they're talking about.

No notation blocks. Just text like a friend.

## GIBBERISH / UNRECOGNIZABLE INPUT

If the user's message is gibberish, random characters, keyboard smashing (e.g. "asdfgh", "qwerty", "jjjjjj"), meaningless symbols, or clearly not a real message about a relationship or conversation:

Respond naturally as a friend would — with light confusion, then redirect. Keep it short and casual.

Examples:
USER: "asdfghjkl"
GOOD: "lol okay that's not a message I can decode — what's actually going on?"

USER: "jjjjjj"
GOOD: "hmm that one's not giving me much to work with. what did they actually say?"

USER: "????? !!!!"
GOOD: "okay I need more than that — what's the actual message you're trying to figure out?"

Never be robotic or formal about it. Keep the same friend energy.`;

  // Build context-aware messages with conversation summary for long chats
  const messages: GPT5Message[] = [{ role: "system", content: systemPrompt }];

  // If conversation is getting long, add a context summary at the start
  if (conversationHistory.length > 6) {
    const contextSummary = buildContextSummary(conversationHistory);
    if (contextSummary) {
      messages.push({
        role: "system",
        content: `[CONVERSATION CONTEXT SUMMARY]\n${contextSummary}\n[END SUMMARY - Use this to maintain continuity]`,
      });
    }
  }

  // Add conversation history
  messages.push(
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }))
  );

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  try {
    // Use streaming for faster perceived response
    const rawResponse = await callGPT5MiniStreaming(messages, onStream, 2500, 0.7);

    // Apply subtle emoji integration to decode responses
    const responseWithEmoji = processDecodeResponseWithEmoji(rawResponse);

    return {
      response: responseWithEmoji,
      notation: undefined, // Streaming version doesn't use notation for simplicity
    };
  } catch (error: any) {
    console.error("[generateDecodeResponseStreaming] Error:", error?.message || error);
    // Call onStream with fallback so the UI shows something
    const fallbackResponse = "I want to make sure I understand what is going on here. What part of this situation feels most confusing or unclear to you?";
    onStream(fallbackResponse, fallbackResponse);
    return {
      response: fallbackResponse,
      notation: undefined,
    };
  }
}

/**
 * Generate an expanded decode response when user provides additional context
 * This follows the 4-part structure focused on UNDERSTANDING, not action:
 * 1. Updated read briefly ("With that context, this leans more toward X than Y.")
 * 2. Identify core uncertainty ("So the real question is whether they're X or Y.")
 * 3. List common misreads or mixed-signal traps people fall into
 * 4. End with a grounded perspective (no texting advice)
 *
 * The goal is to reduce confusion by explaining the social dynamic.
 * The "aha" moment should be understanding, not instruction.
 */
export async function generateContextAwareDecodeResponse(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
  previousAnalysis: StructuredAnalysisResult | null,
  contactName: string | null,
  onStream: StreamCallback
): Promise<{ response: string }> {
  const name = contactName || "they";
  const possessive = contactName ? `${contactName}'s` : "their";
  const verb = contactName ? "is" : "are";

  // Build context about the previous analysis
  const analysisContext = previousAnalysis
    ? `Previous analysis showed:
- Signal: ${previousAnalysis.signalLabel} (${previousAnalysis.signalStrength})
- Surface meaning: ${previousAnalysis.surfaceMeaning}
- Hidden subtext: ${previousAnalysis.hiddenSubtext.map(h => h.meaning).join(", ")}`
    : "";

  const systemPrompt = `You're a sharp friend helping someone decode a text conversation. They just gave you more context about the situation.

## YOUR GOAL

Reduce confusion by explaining the SOCIAL DYNAMIC behind what's happening.
The "aha" moment should be UNDERSTANDING, not instruction.
No texting advice. No action steps. Just clarity.
NEVER use markdown: no **bold**, no _underscores_, no *italics*, no # headers — plain text only.

## YOUR JOB

Generate a response with this EXACT 4-part structure:

**PART 1: Updated Read** (1-2 sentences)
Start with "With that context..." and explain how the new info shifts your interpretation.
- Be specific about what changed: "this leans more toward X than Y" or "this reads less like X and more like Y"
- Reference the context they just shared

**PART 2: Core Insight** (1 sentence)
Identify what's REALLY going on here - the underlying dynamic.
- Start with "So the real question is..." or similar framing
- Frame it as understanding, not decision: "whether this is X or Y" not "what to do next"

**PART 3: Common Misreads** (2-3 bullet points)
List the mixed-signal traps or misinterpretations people commonly fall into with this type of situation.
Use "•" character for bullets.
Format: "People often read this as [misread], but it's usually [actual dynamic]."

Examples of good misread explanations:
• "People often read this as distance, but it's usually just pacing style."
• "This gets mistaken for losing interest when it's really inconsistent communication habits."
• "Looks like avoidance but could just be compartmentalizing stress."

**PART 4: Grounded Perspective** (1-2 sentences)
End with a calm, grounded reframe that puts it in perspective.
- No advice, no "you should", no action items
- Just a clear-eyed take that settles the confusion
- Tone: observational, wise, non-reactive

Examples of good grounded perspectives:
• "So this reads less like losing interest and more like inconsistent communication habits."
• "The pattern here isn't about you - it's about how ${name} ${verb} wired to handle closeness."
• "This is less about the specific message and more about ${possessive} default mode under pressure."

## CONTACT NAME
${contactName ? `The person's name is "${contactName}". Use their name naturally throughout (e.g., "${contactName}'s response", "how ${contactName} operates"). Use the name EXACTLY as given — do NOT add, change, or invent any emojis or characters not already in the name.` : "Use natural pronouns (they/them/their)."}

## STYLE RULES
- Keep it conversational and short
- No therapist language (boundaries, validate, attachment styles, etc.)
- Sound like a smart friend who sees patterns others miss
- Be observational, not prescriptive
- NO texting advice, NO "you should", NO action steps
- Total response: 4-5 short paragraphs max
- NEVER use markdown formatting: no **bold**, no _underscores_, no *italics*, no # headers, no backticks — plain text only

## GIBBERISH / UNRECOGNIZABLE INPUT

If the user's message is gibberish, random characters, keyboard smashing, or clearly not real context about a situation:

Respond as a confused friend would — briefly and casually — then redirect.

Example:
USER: "asdfgh"
GOOD: "lol I need actual context to work with — what's going on with the situation?"

Keep it short, casual, friendly. Same tone as the rest of the conversation.

## PREVIOUS ANALYSIS
${analysisContext}

## EXAMPLE OUTPUT

With that context, this leans more toward avoidance under stress than actual disinterest. The fact that ${name} ${verb} responsive when things are light but pulls back when it gets real suggests a pattern.

So the real question is whether ${possessive} communication style is about you specifically, or just how ${name} handle${contactName ? "s" : ""} anything that feels heavy.

Common misreads here:
• People often see this as losing interest, but it's usually comfort-level fluctuation
• This gets read as "mixed signals" when it's really just inconsistent emotional availability
• Looks personal but it's usually about ${possessive} own capacity in the moment

${contactName ? contactName : "They"} ${verb}n't necessarily pulling away from you - ${name} ${verb} just retreating into a default mode. The pattern tells you more about ${possessive} wiring than about where you stand.`;

  const messages: GPT5Message[] = [{ role: "system", content: systemPrompt }];

  // Add relevant conversation history (last few exchanges)
  const recentHistory = conversationHistory.slice(-6);
  messages.push(
    ...recentHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }))
  );

  // Add current user message (the context they provided)
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await callGPT5MiniStreaming(messages, onStream, 2500, 0.7);
    return { response };
  } catch (error: any) {
    console.error("[generateContextAwareDecodeResponse] Error:", error?.message || error);
    const fallbackResponse = `With that context, I'm getting a clearer picture of the dynamic here.

So the real question is whether this is about you specifically, or just how ${name} operate${contactName ? "s" : ""} in general.

Common misreads here:
• This often looks like distance when it's really just pacing differences
• People assume intent when it's usually just habit

The pattern here tells you more about ${possessive} defaults than about the situation itself.`;
    onStream(fallbackResponse, fallbackResponse);
    return { response: fallbackResponse };
  }
}

/**
 * Generate a smart conversation title that reflects who the user is communicating with
 * and a brief summary of what's being discussed
 * Can analyze images to extract context if provided
 */
export async function generateConversationTitle(
  userMessage: string,
  imageBase64?: string
): Promise<string> {
  const client = getOpenAIClient();

  // Clean up the message - remove [Image] placeholder if present
  const cleanedMessage = userMessage.replace(/\[Image\]/gi, "").trim();

  console.log("[generateConversationTitle] Called with:", {
    hasMessage: !!userMessage,
    messageLength: userMessage?.length,
    cleanedLength: cleanedMessage?.length,
    hasImageBase64: !!imageBase64,
    imageBase64Length: imageBase64?.length,
  });

  const systemPrompt = `You generate very short, descriptive titles for conversations about interpersonal communication.

The title should follow this format:
"[Actual Name] - [Brief topic]"

CRITICAL RULES FOR NAMES:
- If you see a screenshot of a text/messaging app, EXTRACT THE EXACT CONTACT NAME shown at the top of the conversation
- Copy the name CHARACTER-FOR-CHARACTER exactly as it appears — do NOT add, change, or invent any characters
- EMOJIS: ONLY include an emoji if it is LITERALLY part of the displayed contact name text (e.g., "Jessica 💕" where the 💕 is visible as part of the name). If the name shows only letters (e.g., "Charlynne"), output ONLY "Charlynne" — NO emojis added
- iOS shows a ">" chevron/arrow next to contact names — this is NOT an emoji and NOT part of the name, ignore it completely
- NEVER invent, guess, or add emojis that are not literally visible as part of the contact name text
- NEVER use generic terms like "Partner", "Friend", "Coworker" if you can see an actual name
- Only use relationship labels if no name is visible

CRITICAL RULES FOR TOPIC:
- The topic must reflect the DOMINANT subject or emotional theme of the conversation — what is actually being discussed between the two people
- Ignore any app UI text, labels, headers, buttons, or metadata visible in the screenshot (e.g., "Postpartum support", "Deep Search", section headers)
- Focus on what the MESSAGES themselves are about: the relationship dynamic, the conflict, the event, the feeling being expressed
- Use natural, conversational language (e.g., "feeling distant", "making plans", "late night fight", "moving in together")

Examples of GOOD titles (when name is visible):
- "Sarah - Weekend plans" (name has no emoji, so output none)
- "Mike 💪 - Gym schedule" (💪 is literally part of the name text)
- "Dad - Car repair" (name has no emoji, so output none)
- "Jessica 💕 - Date night" (💕 is literally part of the name text)

Examples of titles when NO name visible:
- "They - Rent discussion"
- "Group chat - Party"

Rules:
- Maximum 35 characters total
- NEVER include brackets, parentheses, or technical terms like [Image], (image), etc.
- ALWAYS prioritize the actual contact name from the screenshot over generic relationship labels
- Keep it simple and human-readable

Return ONLY the title, nothing else.`;

  try {
    let messages: any[];

    if (imageBase64) {
      // Use vision model to analyze the image
      const userContent: any[] = [
        {
          type: "text",
          text: cleanedMessage
            ? `Generate a short title for this conversation. The user said: "${cleanedMessage}"`
            : "Generate a short title for this conversation based on the image. Identify who the user is communicating with and what they're discussing.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ];

      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ];

      console.log("[generateConversationTitle] Analyzing image for title");
    } else {
      // Text only - if no text, return default
      if (!cleanedMessage) {
        return "New conversation";
      }

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a short title for this conversation:\n\n"${cleanedMessage}"`,
        },
      ];
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_completion_tokens: 50,
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      console.warn("[generateConversationTitle] No result, using fallback");
      return cleanedMessage
        ? cleanedMessage.substring(0, 30) + (cleanedMessage.length > 30 ? "..." : "")
        : "New conversation";
    }

    // Remove any quotes, brackets, or parenthetical content
    let cleanedResult = result
      .replace(/^["']|["']$/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .trim();

    console.log("[generateConversationTitle] Generated:", cleanedResult);

    return cleanedResult || "New conversation";
  } catch (error) {
    console.error("[generateConversationTitle] Error:", error);
    // Fallback - if we have an image but no text, return a generic title
    // Never return [Image] or similar placeholders
    if (imageBase64) {
      return "Image conversation";
    }
    return cleanedMessage
      ? cleanedMessage.substring(0, 30) + (cleanedMessage.length > 30 ? "..." : "")
      : "New conversation";
  }
}

/**
 * Light Decode Image Analysis for the decode chat loop
 * Provides analysis with hidden undertones and suggested responses
 */
export interface LightDecodeImageResult {
  friendlyResponse: string; // The main conversational response - reads like a text from a trusted friend
  healthScore: number;
  healthLabel: "Healthy" | "Mostly Healthy" | "Mixed Signals" | "Concerning" | "Toxic";
  suggestedResponses: {
    tone: string;
    response: string;
  }[];
  concernPrompt?: string; // Gentle question to ask about user's specific concern if not already stated
}

export async function analyzeLightDecodeImage(
  imageBase64: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<LightDecodeImageResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You are a trusted friend helping someone understand a text conversation they received. Your response should feel like a genuine text message from a close friend who has great social intuition.

## CRITICAL: IDENTIFYING WHO IS WHO

In text message screenshots (iMessage, WhatsApp, Android Messages, etc.):
- RIGHT-ALIGNED messages (usually colored: blue, green, etc.) = The USER who uploaded the screenshot (your friend)
- LEFT-ALIGNED messages (usually gray, white, or darker) = The OTHER PERSON they're texting with

IMPORTANT: Color varies by platform and theme:
- iMessage: Blue (user) vs Gray (other)
- Android/SMS: Green (user) vs Gray/White (other)
- WhatsApp: Green (user) vs White (other)
- Dark mode: Colors may appear different but alignment stays the same

ALWAYS use message ALIGNMENT (left vs right) as the primary identifier, not just color.

## YOUR RESPONSE STYLE

Write like you're texting your friend back after they showed you a screenshot. Be:
- Warm and conversational (like a real text)
- Direct about what you notice
- Supportive but honest
- Brief (2-4 short paragraphs max)

DON'T:
- Use bullet points or headers
- Sound like a therapist or analyst
- Be preachy or lecture-y
- Use formal language
- Say things like "I notice" or "It seems" too much

DO:
- Talk naturally like texting a friend
- Get to the point
- Share your honest read on the situation
- End with something supportive or a gentle question if appropriate

## HEALTH SCORE GUIDELINES (internal use)
Rate the conversation health from 0-100:
- 90-100 (Healthy): Positive, supportive, clear communication
- 70-89 (Mostly Healthy): Generally good with minor concerns
- 40-69 (Mixed Signals): Unclear intentions, some concerning patterns
- 20-39 (Concerning): Multiple red flags, dismissive or manipulative patterns
- 0-19 (Toxic): Clearly harmful, disrespectful, or abusive communication

## IF THE IMAGE IS NOT A CONVERSATION
If the image does not contain a text conversation, respond naturally like:
{
  "friendlyResponse": "Hey, I don't think this is a text conversation screenshot? Send me the convo you want me to look at and I got you!",
  "healthScore": 50,
  "healthLabel": "Mixed Signals",
  "suggestedResponses": []
}

## RESPONSE FORMAT
Return JSON with this structure:

{
  "friendlyResponse": "Your conversational response here. Write 2-4 short paragraphs like you're texting a friend. Be warm, direct, and helpful. If you notice something concerning, say it honestly but kindly. If it looks healthy, reassure them! End with a supportive comment or gentle question if it feels natural.",

  "healthScore": 75,
  "healthLabel": "Mostly Healthy",

  "suggestedResponses": [
    {
      "tone": "Warm",
      "response": "A natural response they could send"
    },
    {
      "tone": "Playful",
      "response": "A lighthearted response option"
    },
    {
      "tone": "Direct",
      "response": "A straightforward response option"
    }
  ],

  "concernPrompt": "Only include if it feels natural to ask what's on their mind - make it casual like 'what part is bugging you?' or 'is there something specific you're trying to figure out?'"
}

## EXAMPLES OF GOOD friendlyResponse TONE

For a healthy conversation:
"Okay this is actually really sweet! They seem genuinely into you - the way they're asking questions and following up shows they care about what you're saying. I wouldn't overthink this one, it reads like they're just happy to be talking to you. What made you want a second opinion?"

For a concerning conversation:
"Hmm okay I'm gonna be honest with you - the way they keep deflecting when you ask direct questions is a little weird. Like you asked twice about plans and both times they changed the subject. Could be nothing, but I'd pay attention to whether this is a pattern. How are you feeling about it?"

For mixed signals:
"So this is interesting... on one hand they're being super responsive which is good. But I noticed they haven't actually committed to anything concrete yet? Like it's all 'yeah we should totally hang' but no actual plans. I wouldn't stress too much but maybe see if they follow through next time."

## SUGGESTED RESPONSES GUIDELINES
- Make them sound natural (casual language, emojis where appropriate)
- Keep them concise (1-2 sentences max)
- Make them actually usable — something they could copy and send`;

  try {
    console.log("[analyzeLightDecodeImage] Starting light decode analysis");
    console.log("[analyzeLightDecodeImage] Image base64 length:", imageBase64?.length || 0);
    console.log("[analyzeLightDecodeImage] Conversation history length:", conversationHistory.length);

    // Detect image MIME type from base64 header
    let mimeType = "image/jpeg"; // Default
    if (imageBase64.startsWith("/9j/")) {
      mimeType = "image/jpeg";
    } else if (imageBase64.startsWith("iVBOR")) {
      mimeType = "image/png";
    } else if (imageBase64.startsWith("R0lGOD")) {
      mimeType = "image/gif";
    } else if (imageBase64.startsWith("UklGR")) {
      mimeType = "image/webp";
    }
    console.log("[analyzeLightDecodeImage] Detected MIME type:", mimeType);

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;
    }> = [{ role: "system", content: systemPrompt }];

    // Add relevant conversation history for context (last few exchanges)
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-4);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add the image with prompt
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
            detail: "high",
          },
        },
        {
          type: "text",
          text: "Help me understand this conversation. Provide your analysis in the JSON format specified.",
        },
      ],
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
      max_completion_tokens: 1200,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    console.log("[analyzeLightDecodeImage] API response received");
    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.warn("[analyzeLightDecodeImage] Empty content from API");
      throw new Error("Empty response from API");
    }

    // Parse JSON response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    console.log("[analyzeLightDecodeImage] Analysis complete");

    const healthScore = Math.min(100, Math.max(0, parsed.healthScore || 50));
    const getHealthLabel = (score: number): LightDecodeImageResult["healthLabel"] => {
      if (score >= 90) return "Healthy";
      if (score >= 70) return "Mostly Healthy";
      if (score >= 40) return "Mixed Signals";
      if (score >= 20) return "Concerning";
      return "Toxic";
    };

    return {
      friendlyResponse: parsed.friendlyResponse || "I had a little trouble reading this one clearly. Can you tell me more about what's going on?",
      healthScore,
      healthLabel: parsed.healthLabel || getHealthLabel(healthScore),
      suggestedResponses: Array.isArray(parsed.suggestedResponses) ? parsed.suggestedResponses.slice(0, 3) : [],
      concernPrompt: parsed.concernPrompt || undefined,
    };
  } catch (error: unknown) {
    // Better error serialization
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "Unknown";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[analyzeLightDecodeImage] Error occurred");
    console.error("[analyzeLightDecodeImage] Error message:", errorMessage);
    console.error("[analyzeLightDecodeImage] Error name:", errorName);
    if (errorStack) {
      console.error("[analyzeLightDecodeImage] Stack:", errorStack.substring(0, 500));
    }

    // Try to extract more info if it's an object with additional properties
    if (error && typeof error === "object") {
      const errObj = error as Record<string, unknown>;
      if (errObj.status) console.error("[analyzeLightDecodeImage] Status:", errObj.status);
      if (errObj.code) console.error("[analyzeLightDecodeImage] Code:", errObj.code);
      if (errObj.response) console.error("[analyzeLightDecodeImage] Response:", JSON.stringify(errObj.response)?.substring(0, 500));
    }

    return {
      friendlyResponse: "I had a little trouble reading this screenshot clearly. The image might be low quality or have an unusual format - try sending a clearer screenshot if you can!",
      healthScore: 50,
      healthLabel: "Mixed Signals",
      suggestedResponses: [],
      concernPrompt: "Is there something specific you wanted to understand about this conversation?",
    };
  }
}

/**
 * Deep Decode: Analyze multiple conversation images to understand communication dynamics
 * Takes an array of base64 images and provides comprehensive analysis
 */
export interface DeepDecodeResult {
  overview: string;
  healthScore: number; // 0-100, where 0 is toxic and 100 is healthy
  healthLabel: "Healthy" | "Mostly Healthy" | "Mixed Signals" | "Concerning" | "Toxic";
  tone: string;
  whatStandsOut: string;
  hiddenUndertones: {
    undertone: string;
    explanation: string;
  }[];
  suggestedResponses: {
    tone: string;
    response: string;
  }[];
  somethingToConsider: string;
}

export async function analyzeDeepDecode(
  imagesBase64: string[],
  additionalContext?: string
): Promise<DeepDecodeResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity in Decode mode — a communication analyst helping someone understand a conversation and decode potential hidden undertones.

## YOUR ROLE
You help people decode conversations to understand:
1. Whether this is a healthy or concerning interaction
2. What hidden undertones or meanings might exist beneath the surface
3. How they could respond effectively

## ANALYSIS APPROACH
1. Read through the conversation screenshots carefully
2. Assess the overall health of the communication dynamic
3. Identify any hidden meanings, undertones, or subtext
4. Provide suggested responses at different tones

## HEALTH SCORE GUIDELINES
Rate the conversation health from 0-100:
- 90-100 (Healthy): Positive, supportive, clear communication
- 70-89 (Mostly Healthy): Generally good with minor concerns
- 40-69 (Mixed Signals): Unclear intentions, some concerning patterns
- 20-39 (Concerning): Multiple red flags, dismissive or manipulative patterns
- 0-19 (Toxic): Clearly harmful, disrespectful, or abusive communication

## RESPONSE FORMAT
Provide your analysis in this JSON structure:

{
  "overview": "1-2 sentences summarizing what this conversation is about",

  "healthScore": 75,
  "healthLabel": "Mostly Healthy",

  "tone": "1-3 words describing the dominant tone (e.g., 'Loving and supportive', 'Distant', 'Passive-aggressive')",

  "whatStandsOut": "2-3 sentences about what specifically stands out in this conversation — the notable moments, phrases, or dynamics",

  "hiddenUndertones": [
    {
      "undertone": "Short name for the possible meaning (e.g., 'Testing boundaries', 'Seeking validation', 'Avoiding commitment')",
      "explanation": "1-2 sentences explaining what this undertone might mean and why you see it"
    }
  ],

  "suggestedResponses": [
    {
      "tone": "Warm & appreciative",
      "response": "A natural response they could send in this tone"
    },
    {
      "tone": "Playful",
      "response": "A lighthearted response option"
    },
    {
      "tone": "Direct",
      "response": "A straightforward response option"
    }
  ],

  "somethingToConsider": "A thoughtful question or reflection point that helps the user think deeper about this interaction"
}

## VOICE & TONE
- Be insightful and helpful
- Direct but not harsh
- Focus on being useful, not preachy

## SUGGESTED RESPONSES GUIDELINES
- Make them sound natural and human (use casual language, emojis where appropriate)
- Each should reflect a different communication style
- Keep them concise (1-2 sentences max)
- Make them actually usable — something they could copy and send`;

  try {
    console.log("[analyzeDeepDecode] Starting analysis of", imagesBase64.length, "images");

    // Build the image content array
    const imageContent = imagesBase64.map((base64, index) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: "high" as const,
      },
    }));

    const userPrompt = additionalContext
      ? `Analyze ${imagesBase64.length > 1 ? "these conversation screenshots" : "this conversation screenshot"} and help me understand what might be going on.

The user has provided this additional context: "${additionalContext}"

Please take this into account in your analysis. Provide your analysis in the JSON format specified.`
      : `Analyze ${imagesBase64.length > 1 ? "these conversation screenshots" : "this conversation screenshot"} and help me understand what might be going on. Provide your analysis in the JSON format specified.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      max_completion_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    console.log("[analyzeDeepDecode] API response received");
    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.warn("[analyzeDeepDecode] Empty content from API");
      throw new Error("Empty response from API");
    }

    // Parse JSON response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate and return
    const healthScore = Math.min(100, Math.max(0, parsed.healthScore || 50));
    const getHealthLabel = (score: number): DeepDecodeResult["healthLabel"] => {
      if (score >= 90) return "Healthy";
      if (score >= 70) return "Mostly Healthy";
      if (score >= 40) return "Mixed Signals";
      if (score >= 20) return "Concerning";
      return "Toxic";
    };

    return {
      overview: parsed.overview || "Unable to fully analyze this conversation.",
      healthScore,
      healthLabel: parsed.healthLabel || getHealthLabel(healthScore),
      tone: parsed.tone || "Unclear",
      whatStandsOut: parsed.whatStandsOut || "More context would help understand this situation better.",
      hiddenUndertones: Array.isArray(parsed.hiddenUndertones)
        ? parsed.hiddenUndertones.slice(0, 3)
        : [],
      suggestedResponses: Array.isArray(parsed.suggestedResponses)
        ? parsed.suggestedResponses.slice(0, 3)
        : [],
      somethingToConsider: parsed.somethingToConsider || "Take time to reflect on what feels important to you here.",
    };
  } catch (error: any) {
    console.error("[analyzeDeepDecode] Analysis failed:", error);

    // Return a graceful fallback
    return {
      overview: "Unable to analyze this conversation. Please try again with clearer screenshots.",
      healthScore: 50,
      healthLabel: "Mixed Signals",
      tone: "Unable to determine",
      whatStandsOut: "Could not complete the analysis.",
      hiddenUndertones: [],
      suggestedResponses: [],
      somethingToConsider: "Try uploading clearer screenshots with readable text.",
    };
  }
}

// ============================================
// STRUCTURED ANALYSIS TYPES & FUNCTIONS
// ============================================

import type {
  StructuredAnalysisResult,
  SignalStrength,
  AttachmentStyle,
  IntentProbability,
  PatternRisk,
} from "../types/chat";

export async function generateStructuredAnalysis(
  messageText: string,
  additionalContext?: string
): Promise<StructuredAnalysisResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You decode messages. Calm. Observant. Strategic.

## OUTPUT FORMAT
JSON only. No markdown. No preamble.

{
  "surfaceMeaning": "One sentence. What's literally being said. No fluff.",

  "hiddenSubtext": [
    {
      "meaning": "Pattern label (2-4 words max)",
      "explanation": "One short sentence. What this signals."
    }
  ],

  "signalStrength": "green" | "yellow" | "red",
  "signalLabel": "Low Concern" | "Mixed Signals" | "Potential Red Flag",

  "powerMoveExplanation": "One sentence. Strategic rationale only.",

  "powerMoveReplies": [
    { "style": "calm", "message": "Short reply. Warm but controlled." },
    { "style": "direct", "message": "Short reply. Clear and unambiguous." },
    { "style": "detached", "message": "Short reply. Low investment energy." }
  ],

  "deeperPattern": {
    "attachmentStyle": "secure" | "anxious" | "avoidant" | "disorganized" | "unclear",
    "attachmentExplanation": "One sentence. Observable behavior only.",
    "intentProbability": "genuine" | "uncertain" | "likely_avoidant" | "testing",
    "intentExplanation": "One sentence. What the pattern suggests.",
    "patternRisk": "low" | "moderate" | "high",
    "patternRiskExplanation": "One sentence. Long-term signal if repeated."
  }
}

## SIGNAL STRENGTH
- GREEN: Direct communication. Signals alignment. No inconsistencies.
- YELLOW: Mixed signals. Some ambiguity. Worth watching.
- RED: Avoidance patterns. Emotional mismatch. Control dynamics.

## HIDDEN SUBTEXT RULES
- 3-4 items max
- Pattern labels only: "Seeking validation", "Testing availability", "Emotional hedging"
- Short explanations: "Could signal X" or "May indicate Y"
- No storytelling

## POWER MOVE REPLIES
- Under 15 words each
- Calm: grounded, present
- Direct: no games, clear ask
- Detached: unbothered energy

## TONE RULES
- Short sentences only
- No therapy language
- No relationship blog phrases
- No over-validation
- Label patterns, don't explain feelings
- Sound like strategic clarity, not a counselor

BANNED PHRASES:
- "reinforces the emotional connection"
- "healthy and secure"
- "vulnerability"
- "creates space for"
- "emotional availability"
- "nurturing"
- "validates their feelings"

PREFERRED STYLE:
- "Signals alignment" not "Shows healthy connection"
- "Direct and responsive" not "Emotionally available"
- "Low friction" not "Healthy dynamic"
- "Pattern consistent" not "Secure attachment behavior"`;

  try {
    console.log("[generateStructuredAnalysis] Starting analysis");

    const userPrompt = additionalContext
      ? `Analyze this message and help me understand what's really going on:

"${messageText}"

Additional context: ${additionalContext}

Provide your analysis in the JSON format specified.`
      : `Analyze this message and help me understand what's really going on:

"${messageText}"

Provide your analysis in the JSON format specified.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_completion_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    console.log("[generateStructuredAnalysis] API response received");
    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.warn("[generateStructuredAnalysis] Empty content from API");
      throw new Error("Empty response from API");
    }

    // Parse JSON response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate and return structured result
    const validSignalStrengths: SignalStrength[] = ["green", "yellow", "red"];
    const validAttachmentStyles: AttachmentStyle[] = ["secure", "anxious", "avoidant", "disorganized", "unclear"];
    const validIntentProbabilities: IntentProbability[] = ["genuine", "uncertain", "likely_avoidant", "testing"];
    const validPatternRisks: PatternRisk[] = ["low", "moderate", "high"];

    const signalStrength: SignalStrength = validSignalStrengths.includes(parsed.signalStrength)
      ? parsed.signalStrength
      : "yellow";

    const getSignalLabel = (strength: SignalStrength): string => {
      switch (strength) {
        case "green":
          return "Low Concern";
        case "yellow":
          return "Mixed Signals";
        case "red":
          return "Potential Red Flag";
      }
    };

    const result: StructuredAnalysisResult = {
      surfaceMeaning: parsed.surfaceMeaning || "Unable to determine the surface meaning.",

      hiddenSubtext: Array.isArray(parsed.hiddenSubtext)
        ? parsed.hiddenSubtext.slice(0, 4).map((item: { meaning?: string; explanation?: string }) => ({
            meaning: item.meaning || "Unknown pattern",
            explanation: item.explanation || "",
          }))
        : [],

      signalStrength,
      signalLabel: parsed.signalLabel || getSignalLabel(signalStrength),

      powerMoveExplanation: parsed.powerMoveExplanation || "Consider your response carefully.",

      powerMoveReplies: Array.isArray(parsed.powerMoveReplies)
        ? parsed.powerMoveReplies.slice(0, 3).map((reply: { style?: string; message?: string }) => ({
            style: (["calm", "direct", "detached"].includes(reply.style || "") ? reply.style : "calm") as "calm" | "direct" | "detached",
            message: reply.message || "",
          }))
        : [
            { style: "calm" as const, message: "I appreciate you sharing that with me." },
            { style: "direct" as const, message: "Can you help me understand what you mean?" },
            { style: "detached" as const, message: "Okay, noted." },
          ],

      deeperPattern: parsed.deeperPattern
        ? {
            attachmentStyle: validAttachmentStyles.includes(parsed.deeperPattern.attachmentStyle)
              ? parsed.deeperPattern.attachmentStyle
              : "unclear",
            attachmentExplanation: parsed.deeperPattern.attachmentExplanation || "More context needed to determine attachment patterns.",
            intentProbability: validIntentProbabilities.includes(parsed.deeperPattern.intentProbability)
              ? parsed.deeperPattern.intentProbability
              : "uncertain",
            intentExplanation: parsed.deeperPattern.intentExplanation || "Intent is unclear from this message alone.",
            patternRisk: validPatternRisks.includes(parsed.deeperPattern.patternRisk)
              ? parsed.deeperPattern.patternRisk
              : "moderate",
            patternRiskExplanation: parsed.deeperPattern.patternRiskExplanation || "Consider observing this pattern over time.",
          }
        : undefined,
    };

    return result;
  } catch (error: unknown) {
    // Log quietly - transient errors are expected
    console.log("[Klarity] Text analysis temporarily unavailable, please try again in a moment");

    // Return a graceful fallback that encourages retry
    return {
      surfaceMeaning: "Having a brief moment of difficulty. Please try sending your message again.",
      hiddenSubtext: [
        {
          meaning: "Try again in a moment",
          explanation: "Our analysis service had a brief hiccup. These resolve quickly.",
        },
      ],
      signalStrength: "yellow",
      signalLabel: "Retry Needed",
      powerMoveExplanation: "Just send your message again to retry.",
      powerMoveReplies: [
        { style: "calm", message: "Try sending again" },
        { style: "direct", message: "Retry the message" },
        { style: "detached", message: "Try once more" },
      ],
    };
  }
}

export async function generateStructuredAnalysisFromImage(
  imagesBase64: string[],
  additionalContext?: string
): Promise<StructuredAnalysisResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You decode conversations. Calm. Observant. Strategic.

## OUTPUT FORMAT
JSON only. No markdown. No preamble.

{
  "contactName": "Name of the other person as shown EXACTLY in the screenshot header/title. CRITICAL: Copy the name character-for-character including all emojis as they literally appear — do NOT substitute, guess, add, or use similar-looking emoji variants. ONLY include an emoji if it is literally part of the displayed name text. If the name shows only letters (e.g., 'Charlynne'), output ONLY those letters — never add emojis. iOS shows a '>' chevron arrow next to contact names — this is a UI navigation element, NOT part of the name, ignore it completely. Example: if the header shows 'Dané❤️💖' output exactly 'Dané❤️💖', never 'Dané❤️‍🩹💖'. If unclear, use null.",

  "surfaceMeaning": "One sentence. What's literally being said. No fluff.",

  "hiddenSubtext": [
    {
      "meaning": "Pattern label (2-4 words max)",
      "explanation": "One short sentence. What this signals."
    }
  ],

  "signalStrength": "green" | "yellow" | "red",
  "signalLabel": "Low Concern" | "Mixed Signals" | "Potential Red Flag",

  "powerMoveExplanation": "One sentence. Strategic rationale only.",

  "powerMoveReplies": [
    { "style": "calm", "message": "Short reply. Warm but controlled." },
    { "style": "direct", "message": "Short reply. Clear and unambiguous." },
    { "style": "detached", "message": "Short reply. Low investment energy." }
  ],

  "deeperPattern": {
    "attachmentStyle": "secure" | "anxious" | "avoidant" | "disorganized" | "unclear",
    "attachmentExplanation": "One sentence. Observable behavior only.",
    "intentProbability": "genuine" | "uncertain" | "likely_avoidant" | "testing",
    "intentExplanation": "One sentence. What the pattern suggests.",
    "patternRisk": "low" | "moderate" | "high",
    "patternRiskExplanation": "One sentence. Long-term signal if repeated."
  }
}

## SIGNAL STRENGTH
- GREEN: Direct communication. Signals alignment. No inconsistencies.
- YELLOW: Mixed signals. Some ambiguity. Worth watching.
- RED: Avoidance patterns. Emotional mismatch. Control dynamics.

## HIDDEN SUBTEXT RULES
- 3-4 items max
- Pattern labels only: "Seeking validation", "Testing availability", "Emotional hedging"
- Short explanations: "Could signal X" or "May indicate Y"
- No storytelling

## POWER MOVE REPLIES
- Under 15 words each
- Calm: grounded, present
- Direct: no games, clear ask
- Detached: unbothered energy

## TONE RULES
- Short sentences only
- No therapy language ("attachment style" in labels is fine, but no "emotional vulnerability" or "reinforces connection")
- No relationship blog phrases
- No over-validation ("This is so healthy!" = banned)
- Label patterns, don't explain feelings
- Sound like strategic clarity, not a counselor

BANNED PHRASES:
- "reinforces the emotional connection"
- "healthy and secure"
- "vulnerability"
- "creates space for"
- "emotional availability"
- "nurturing"
- "validates their feelings"

PREFERRED STYLE:
- "Signals alignment" not "Shows healthy connection"
- "Direct and responsive" not "Emotionally available"
- "Low friction" not "Healthy dynamic"
- "Pattern consistent" not "Secure attachment behavior"`;

  try {
    console.log("[generateStructuredAnalysisFromImage] Starting analysis of", imagesBase64.length, "images");

    // Build the image content array
    const imageContent = imagesBase64.map((base64) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: "high" as const,
      },
    }));

    const userPrompt = additionalContext
      ? `Analyze ${imagesBase64.length > 1 ? "these conversation screenshots" : "this conversation screenshot"} and help me understand what's really going on.

Additional context: ${additionalContext}

Provide your analysis in the JSON format specified.`
      : `Analyze ${imagesBase64.length > 1 ? "these conversation screenshots" : "this conversation screenshot"} and help me understand what's really going on.

Provide your analysis in the JSON format specified.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      max_completion_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    console.log("[generateStructuredAnalysisFromImage] API response received");
    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.warn("[generateStructuredAnalysisFromImage] Empty content from API");
      throw new Error("Empty response from API");
    }

    // Parse JSON response
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate and return structured result (same validation as text version)
    const validSignalStrengths: SignalStrength[] = ["green", "yellow", "red"];
    const validAttachmentStyles: AttachmentStyle[] = ["secure", "anxious", "avoidant", "disorganized", "unclear"];
    const validIntentProbabilities: IntentProbability[] = ["genuine", "uncertain", "likely_avoidant", "testing"];
    const validPatternRisks: PatternRisk[] = ["low", "moderate", "high"];

    const signalStrength: SignalStrength = validSignalStrengths.includes(parsed.signalStrength)
      ? parsed.signalStrength
      : "yellow";

    const getSignalLabel = (strength: SignalStrength): string => {
      switch (strength) {
        case "green":
          return "Low Concern";
        case "yellow":
          return "Mixed Signals";
        case "red":
          return "Potential Red Flag";
      }
    };

    const result: StructuredAnalysisResult = {
      surfaceMeaning: parsed.surfaceMeaning || "Unable to determine the surface meaning.",

      hiddenSubtext: Array.isArray(parsed.hiddenSubtext)
        ? parsed.hiddenSubtext.slice(0, 4).map((item: { meaning?: string; explanation?: string }) => ({
            meaning: item.meaning || "Unknown pattern",
            explanation: item.explanation || "",
          }))
        : [],

      signalStrength,
      signalLabel: parsed.signalLabel || getSignalLabel(signalStrength),

      powerMoveExplanation: parsed.powerMoveExplanation || "Consider your response carefully.",

      powerMoveReplies: Array.isArray(parsed.powerMoveReplies)
        ? parsed.powerMoveReplies.slice(0, 3).map((reply: { style?: string; message?: string }) => ({
            style: (["calm", "direct", "detached"].includes(reply.style || "") ? reply.style : "calm") as "calm" | "direct" | "detached",
            message: reply.message || "",
          }))
        : [
            { style: "calm" as const, message: "I appreciate you sharing that with me." },
            { style: "direct" as const, message: "Can you help me understand what you mean?" },
            { style: "detached" as const, message: "Okay, noted." },
          ],

      // Extract contact name from the conversation screenshot
      contactName: parsed.contactName || undefined,

      deeperPattern: parsed.deeperPattern
        ? {
            attachmentStyle: validAttachmentStyles.includes(parsed.deeperPattern.attachmentStyle)
              ? parsed.deeperPattern.attachmentStyle
              : "unclear",
            attachmentExplanation: parsed.deeperPattern.attachmentExplanation || "More context needed to determine attachment patterns.",
            intentProbability: validIntentProbabilities.includes(parsed.deeperPattern.intentProbability)
              ? parsed.deeperPattern.intentProbability
              : "uncertain",
            intentExplanation: parsed.deeperPattern.intentExplanation || "Intent is unclear from this conversation alone.",
            patternRisk: validPatternRisks.includes(parsed.deeperPattern.patternRisk)
              ? parsed.deeperPattern.patternRisk
              : "moderate",
            patternRiskExplanation: parsed.deeperPattern.patternRiskExplanation || "Consider observing this pattern over time.",
          }
        : undefined,
    };

    return result;
  } catch (error: unknown) {
    // Log quietly - transient errors are expected
    console.log("[Klarity] Image analysis temporarily unavailable, please try again in a moment");

    // Return a graceful fallback that encourages retry
    return {
      surfaceMeaning: "Having a moment of temporary difficulty processing this image. This usually resolves quickly - please try again.",
      hiddenSubtext: [
        {
          meaning: "Try again in a moment",
          explanation: "Our analysis service had a brief hiccup. These resolve quickly.",
        },
      ],
      signalStrength: "yellow",
      signalLabel: "Retry Needed",
      powerMoveExplanation: "Just tap the image again to retry analysis.",
      powerMoveReplies: [
        { style: "calm", message: "Try uploading again" },
        { style: "direct", message: "Retry the analysis" },
        { style: "detached", message: "Try once more" },
      ],
    };
  }
}

/**
 * Generate a post-decode clarity message
 * Provides a specific, actionable context suggestion based on what's unclear in the conversation
 * Format: "Here is more context you can add to get a better idea of [specific thing]:" + 3 helpful suggestions
 */
export async function generatePostDecodeClarity(
  analysis: StructuredAnalysisResult
): Promise<string> {
  const signalStrength = analysis.signalStrength;
  const signalLabel = analysis.signalLabel;
  const surfaceMeaning = analysis.surfaceMeaning;
  const hiddenSubtext = analysis.hiddenSubtext.map(item => item.meaning).join(", ");
  const contactName = analysis.contactName || null;

  const systemPrompt = `You are Klarity. After showing analysis, you help users understand what extra context would make the interpretation more accurate.

YOUR JOB:
Generate a single helpful section that identifies the KEY UNCERTAINTY in this conversation and suggests 3 specific pieces of context that would help clarify it.

${contactName ? `IMPORTANT: The person in the conversation is named "${contactName}" — use this name exactly as given (including any emojis) in your suggestions instead of "they/them/their". For example, instead of "how they usually text", say "how ${contactName} usually texts".` : ""}

FORMAT (exactly this structure):
1. One intro sentence: "Here is more context you can add to get a better idea of [specific uncertainty]:"
2. Then exactly 3 bullet suggestions using "•" character

THE INTRO SENTENCE:
- Must identify the SPECIFIC thing that's unclear or hard to interpret
- Base it on the signal strength, subtext, and surface meaning
- Should feel helpful and specific to THIS conversation
${contactName ? `- Use "${contactName}" in the intro when referring to them (e.g., "why ${contactName} seems distant")` : ""}

GOOD intro examples (adapt to the actual conversation):
${contactName
  ? `- "Here is more context you can add to get a better idea of why ${contactName} seems distant in these texts:"
- "Here is more context you can add to get a better idea of whether ${contactName} is genuinely interested or just being polite:"
- "Here is more context you can add to get a better idea of what's causing the shift in ${contactName}'s tone:"
- "Here is more context you can add to get a better idea of whether ${contactName} is testing you or genuinely busy:"
- "Here is more context you can add to get a better idea of why ${contactName} is being vague about plans:"`
  : `- "Here is more context you can add to get a better idea of why she seems distant in these texts:"
- "Here is more context you can add to get a better idea of whether this is genuine interest or just politeness:"
- "Here is more context you can add to get a better idea of what's causing the shift in their tone:"
- "Here is more context you can add to get a better idea of whether they're testing you or genuinely busy:"
- "Here is more context you can add to get a better idea of why he's being vague about plans:"`}

BAD intro examples (NEVER use):
- Generic phrases that don't specify the uncertainty
- "Here is more context you can add:" (too vague)
- Anything that sounds clinical or like a form

THE 3 SUGGESTIONS:
- Should be specific, actionable things the user could share
- Write them as short phrases (not questions, not full sentences)
- Make them directly relevant to the uncertainty you identified
- Keep them casual and natural
${contactName ? `- Use "${contactName}" instead of "they/their" (e.g., "how ${contactName} usually responds" not "how they usually respond")` : ""}

GOOD suggestion examples${contactName ? ` (using the name ${contactName})` : ""}:
${contactName
  ? `• how ${contactName} usually responds when interested
• what happened right before this convo
• ${contactName}'s typical texting style with you
• if there's been tension recently with ${contactName}
• whether this tone is new or normal for ${contactName}
• how long you've been talking to ${contactName}
• if something specific triggered this shift`
  : `• how they usually respond when interested
• what happened right before this convo
• their typical texting style with you
• if there's been tension recently
• whether this tone is new or normal for them
• how long you've been talking
• if something specific triggered this shift`}

BAD suggestions (NEVER use):
• Questions ("How do you feel?")
• Full sentences
• Anything formal or clinical
• Generic advice not specific to the conversation

Tone: Helpful and direct. This should feel like a friend pointing out exactly what would help them give better advice.`;

  const userPrompt = `Signal: ${signalLabel} (${signalStrength})
Surface meaning: ${surfaceMeaning}
Hidden subtext: ${hiddenSubtext}
${contactName ? `Contact name: ${contactName}` : "Contact name: Unknown"}

Generate the intro sentence that identifies the specific uncertainty, followed by exactly 3 bullet suggestions.${contactName ? ` Use "${contactName}" in your response instead of generic pronouns.` : ""}`;

  try {
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      200,
      false,
      0.7
    );
    return response.trim();
  } catch (error) {
    // Fallback based on signal strength, using contact name if available
    const name = contactName || "they";
    const possessive = contactName ? `${contactName}'s` : "their";

    const fallbackUncertainty = signalStrength === "red"
      ? `why ${possessive} tone feels off`
      : signalStrength === "yellow"
      ? "whether this is a concern or just miscommunication"
      : `what ${name} actually ${contactName ? "means" : "mean"}`;

    return `Here is more context you can add to get a better idea of ${fallbackUncertainty}:
• how ${name} usually text${contactName ? "s" : ""} you
• what was said right before this
• whether this tone is normal for ${name}`;
  }
}

/**
 * Analyze an edited reply and generate a dynamic lightbulb comment
 *
 * Purpose: Preview how the edited message may be perceived by the recipient
 * This is NOT advice, NOT correction, NOT repeating the user's tone request
 *
 * The lightbulb describes IMPACT, not INTENT
 */
export async function analyzeEditedReply(
  editedReply: string,
  originalReply?: string,
  context?: {
    intention?: "improve" | "distance" | "maintain" | "clarity";
    originalGuidanceNote?: string;
  }
): Promise<{ guidanceNote: string; hasSignificantChange: boolean }> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity's Landing Preview system. Your job is to describe how a message will LAND on the recipient — not what the sender intended.

## YOUR TASK
Analyze the user's edited reply and generate a single short sentence describing how it will be PERCEIVED by the recipient.

## CRITICAL RULES

1. ONE SHORT SENTENCE ONLY
   - Maximum 12 words
   - Observational wording only

2. USE SOFT PERCEPTION LANGUAGE
   - "reads as...", "comes across as...", "feels..."
   - NEVER use certainty language like "will make them feel" or "they will think"

3. DESCRIBE IMPACT, NOT INTENT
   - Focus on how the message lands emotionally
   - Do NOT describe what the message does mechanically

4. NEVER OUTPUT:
   - Advice ("consider...", "you may want...")
   - Strategy ("preserves leverage", "maintains the upper hand")
   - Therapy language ("validates their feelings")
   - Absolute predictions ("they will feel X")
   - The user's chosen tone restated (if they asked for "professional", don't say "professional tone")
   - Commands or suggestions

5. REACT TO THESE QUALITIES:
   - Emotional intensity (warm vs cold)
   - Warmth vs neutrality
   - Directness vs softness
   - Length (brief vs elaborate)
   - Formality shift
   - Supportiveness vs firmness

## EXAMPLES OF GOOD OUTPUT:
- "Reads as warm and engaged"
- "Comes across as slightly distant"
- "Feels more direct than before"
- "Lands as calm and measured"
- "Reads as softer now"
- "Comes across as more open"
- "Feels a bit cooler in tone"
- "Reads as emotionally neutral"
- "Comes across as genuinely caring"
- "Feels lighter and more casual"

## EXAMPLES OF BAD OUTPUT (NEVER WRITE THESE):
- "This will make them feel heard" (certainty + advice)
- "Consider adding more warmth" (advice)
- "Professional tone maintained" (restating user's request)
- "This validates their perspective" (therapy language)
- "Good boundary setting" (strategy/advice)
- "They will appreciate this" (prediction)

## DETERMINING SIGNIFICANT CHANGE
Set hasSignificantChange to true only if:
- Emotional tone shifted noticeably (warm→cold, soft→direct)
- Length changed substantially (added/removed 30%+ content)
- Formality changed
- New emotional elements added (softening, firmness)

Set hasSignificantChange to false if:
- Minor word changes
- Punctuation changes
- Small rephrasings that don't change the feel

Respond with valid JSON only:
{
  "guidanceNote": "string (one short sentence, max 12 words)",
  "hasSignificantChange": boolean
}`;

  const userMessage = originalReply
    ? `Original reply: "${originalReply}"

Edited reply: "${editedReply}"

${context?.originalGuidanceNote ? `Previous landing preview: "${context.originalGuidanceNote}"` : ""}
${context?.intention ? `User's intention: ${context.intention}` : ""}`
    : `Reply to analyze: "${editedReply}"

${context?.intention ? `User's intention: ${context.intention}` : ""}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content?.trim() || "";

    // Parse JSON
    let parsed: { guidanceNote?: string; hasSignificantChange?: boolean } = {};
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, use content as guidanceNote
      parsed = { guidanceNote: content, hasSignificantChange: true };
    }

    return {
      guidanceNote: parsed.guidanceNote || "Reads as thoughtful",
      hasSignificantChange: parsed.hasSignificantChange ?? true,
    };
  } catch (error) {
    console.error("[analyzeEditedReply] Error:", error);
    return {
      guidanceNote: "Reads as thoughtful",
      hasSignificantChange: false,
    };
  }
}

// ============================================
// DECODE CLARIFICATION CONVERSATION
// ============================================

export interface DecodeClarificationContext {
  originalAnalysisTone: string;        // Main tone from decode analysis (e.g., "confusing", "frustrating")
  originalAnalysisTopics: string[];    // Key topics/concerns identified
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  turnsCompleted: number;
}

export interface DecodeClarificationOpeningResult {
  question: string;
  toneReference: string;
  topicReference?: string;
}

/**
 * Generate the opening clarification question after Decode analysis
 * This is the first message Klarity sends to start the reality-check conversation
 */
export async function generateDecodeClarificationOpening(
  analysisTone: string,
  analysisTopics: string[],
  surfaceMeaning?: string
): Promise<DecodeClarificationOpeningResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity, a close friend the user just sent a screenshot to decode. You've analyzed it, and now you're curious about the backstory.

## YOUR GOAL
Ask what made them want to decode this message in the first place. You're genuinely curious about the situation - what's going on with them and this person?

## VIBE
- You're a friend who just got forwarded a screenshot and wants the tea
- Genuinely curious, not clinical or probing
- Warm but direct - you care about them
- This is a natural text conversation, not an interview

## QUESTION STYLE
Ask ONE casual question that invites them to share what's going on. Examples of the energy:
- "What's the context here?"
- "What's going on with you two?"
- "What made you want to decode this one?"
- "What's the story with this?"
- "Is something going on?"

DO NOT ask:
- "What was most [adjective] to you?" (too clinical)
- "What stood out?" (too analytical)
- Multiple questions
- Anything that sounds like a form or survey

## OUTPUT FORMAT (JSON only)
{
  "question": "Your casual opening question",
  "toneReference": "The emotional vibe you're picking up on",
  "topicReference": "Optional: what the convo seems to be about"
}`;

  const topicsList = analysisTopics.length > 0
    ? analysisTopics.slice(0, 3).join(", ")
    : "the conversation";

  const userPrompt = `You just analyzed a message for your friend. Now ask them what's going on - why did they send you this?

What the message was about: ${surfaceMeaning || topicsList}
Emotional vibe you picked up: ${analysisTone}

Ask ONE casual question to understand the backstory. Keep it natural - like you're texting a friend who just forwarded you a screenshot.`;

  try {
    console.log("[generateDecodeClarificationOpening] Starting with tone:", analysisTone);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);

    return {
      question: parsed.question || "What's going on with you two?",
      toneReference: parsed.toneReference || analysisTone,
      topicReference: parsed.topicReference,
    };
  } catch (error) {
    console.error("[generateDecodeClarificationOpening] Error:", error);
    return {
      question: "What's the story here?",
      toneReference: analysisTone || "unclear",
    };
  }
}

export interface DecodeClarificationResponse {
  response: string;
  shouldContinue: boolean;   // Whether to ask another question
  followUpQuestion?: string; // Next question if continuing
  perspective?: string;      // Calibrated perspective if concluding
}

/**
 * Generate Klarity's response during the clarification conversation
 * Follows the 3-turn max rule and conversation style guidelines
 */
export async function generateDecodeClarificationResponse(
  userMessage: string,
  context: DecodeClarificationContext
): Promise<DecodeClarificationResponse> {
  const client = getOpenAIClient();

  const turnsRemaining = 3 - context.turnsCompleted;
  const isLastTurn = turnsRemaining <= 1;

  const systemPrompt = `You are Klarity, a close friend having a natural conversation. Your friend sent you a screenshot to decode, and now you're chatting about what's going on in their life.

## CONVERSATION STATE
This is turn ${context.turnsCompleted + 1} of max 3.
${isLastTurn ? "FINAL TURN - wrap up the conversation naturally with your honest take." : ""}

## YOUR VIBE
You're the friend who's good at reading between the lines. You genuinely care and you're curious about what's going on. You're real with people - not harsh, but honest.

## HOW TO RESPOND
This is a back-and-forth conversation, not an interview. Respond naturally to what they just said:

- If they shared something meaningful: React to it genuinely, then ask a natural follow-up if you need more context
- If they're being vague: Gently dig deeper with curiosity, not interrogation
- If you have enough context: Share your honest read on the situation

Natural follow-up questions sound like:
- "How long has this been going on?"
- "Is this out of character for them?"
- "What do you think is really going on?"
- "Have you two talked about this?"

NOT like:
- "Is this typical for them?" (too clinical)
- "What about [topic] concerns you?" (sounds like a survey)

${isLastTurn ? `
## WRAPPING UP
Share your honest perspective on what you're seeing. Be real but kind. Reference what they told you and what you noticed in the message. Don't give a lecture - just share your read like a friend would.
` : ""}

## RESPONSE RULES
- 1-2 sentences max
- React to what they said before asking more
- Sound like a text from a friend, not a therapist
- No therapy-speak, no diagnoses, no declaring anyone guilty/innocent

## OUTPUT FORMAT (JSON only)
{
  "response": "Your natural response",
  "shouldContinue": ${isLastTurn ? "false" : "true/false based on if you need more context"},
  "followUpQuestion": "If continuing, what's your follow-up?",
  "perspective": "If wrapping up, your honest take"
}

## BANNED PHRASES
- "I understand how you feel" / "That must be hard"
- "boundaries" / "communicate openly" / "healthy relationship"
- "What about [X] concerns you?" / "Is this typical for them?"
- Any question that sounds like a form field`;

  const historyContext = context.conversationHistory
    .map(m => `${m.role === "user" ? "User" : "Klarity"}: ${m.content}`)
    .join("\n");

  const userPrompt = `You're chatting with your friend about a message they asked you to decode.

What the message was about: ${context.originalAnalysisTopics.join(", ")}
Vibe you picked up: ${context.originalAnalysisTone}

Your conversation so far:
${historyContext}

They just said: "${userMessage}"

${isLastTurn
  ? "This is your last message - share your honest read on the situation and wrap up naturally."
  : "Respond naturally. If you need more context to give good advice, ask. If you have enough to share your take, do that."}`;

  try {
    console.log("[generateDecodeClarificationResponse] Turn:", context.turnsCompleted + 1);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);

    // Force conclusion on last turn
    if (isLastTurn) {
      return {
        response: parsed.response || parsed.perspective || "I think you already know what's going on here. Trust your gut.",
        shouldContinue: false,
        perspective: parsed.perspective || parsed.response,
      };
    }

    return {
      response: parsed.response || "Got it.",
      shouldContinue: parsed.shouldContinue ?? false,
      followUpQuestion: parsed.followUpQuestion,
      perspective: parsed.perspective,
    };
  } catch (error) {
    console.error("[generateDecodeClarificationResponse] Error:", error);
    return {
      response: "I hear you. Trust your instincts on this one.",
      shouldContinue: false,
    };
  }
}

/**
 * Extract tone and topics from a structured analysis result for clarification
 */
export function extractClarificationContext(
  analysis: {
    signalStrength?: string;
    signalLabel?: string;
    surfaceMeaning?: string;
    hiddenSubtext?: Array<{ meaning: string; explanation?: string }>;
  }
): { tone: string; topics: string[] } {
  // Determine tone from signal strength
  let tone = "unclear";
  if (analysis.signalStrength === "red" || analysis.signalLabel?.includes("Red Flag")) {
    tone = "concerning";
  } else if (analysis.signalStrength === "yellow" || analysis.signalLabel?.includes("Mixed")) {
    tone = "confusing";
  } else if (analysis.signalStrength === "green") {
    tone = "clear";
  }

  // Extract topics from hidden subtext
  const topics: string[] = [];
  if (analysis.hiddenSubtext) {
    topics.push(...analysis.hiddenSubtext.slice(0, 3).map(item => item.meaning));
  }

  return { tone, topics };
}

