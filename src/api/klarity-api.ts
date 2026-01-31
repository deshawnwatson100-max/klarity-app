import { EmotionalAnalysis, SuggestedResponse, ImageAnalysis, BoundaryAnalysis } from "../types/chat";
import { getOpenAIClient } from "./openai";
import { processDecodeResponseWithEmoji } from "../utils/decodeEmoji";

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
    return { userResponse: fullResponse.trim(), notation: null };
  }

  // Extract user-facing response (everything before the notation block)
  const userResponse = fullResponse
    .replace(/\[\[KLARITY_NOTES\]\][\s\S]*?\[\[\/KLARITY_NOTES\]\]/, "")
    .trim();

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
const MODEL_FULL = "gpt-5.2"; // Main model for all operations

/**
 * Streaming callback type for real-time text updates
 */
export type StreamCallback = (chunk: string, fullText: string) => void;

/**
 * Send a chat request to GPT-5.2
 */
async function callGPT5Mini(
  messages: GPT5Message[],
  maxTokens: number = 1000,
  useJsonMode: boolean = false,
  temperature: number = 0.75
): Promise<string> {
  const client = getOpenAIClient();

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

  try {
    const completion = await client.chat.completions.create(params);

    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.error("Empty response from API");
      throw new Error("Empty response from API");
    }

    return content;
  } catch (error: any) {
    console.error("API Error details:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });
    throw new Error(`API failed: ${error.message || "Unknown error"}`);
  }
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
  const client = getOpenAIClient();

  const baseParams: any = {
    model: MODEL_FULL,
    messages: messages as any,
    max_completion_tokens: maxTokens,
    temperature,
  };

  // Helper function for non-streaming fallback
  const doNonStreamingFallback = async (): Promise<string> => {
    console.log("[callGPT5MiniStreaming] Using non-streaming fallback");
    const response = await client.chat.completions.create(baseParams);
    const content = response.choices[0]?.message?.content || "";
    if (content) {
      onStream(content, content);
    }
    return content;
  };

  try {
    // Try streaming first
    const streamParams = { ...baseParams, stream: true };
    const stream: any = await client.chat.completions.create(streamParams);

    // Check if stream is valid and iterable before attempting iteration
    if (!stream || typeof stream[Symbol.asyncIterator] !== "function") {
      console.log("[callGPT5MiniStreaming] Stream not iterable, falling back to non-streaming");
      return await doNonStreamingFallback();
    }

    let fullContent = "";
    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          onStream(content, fullContent);
        }
      }
    } catch (iterationError: any) {
      // Handle "no body" error during iteration
      console.log("[callGPT5MiniStreaming] Stream iteration error:", iterationError.message);
      if (fullContent) {
        // Return what we got so far
        return fullContent;
      }
      // Fall back to non-streaming
      return await doNonStreamingFallback();
    }

    if (fullContent) {
      return fullContent;
    }

    // If streaming returned empty, fall back to non-streaming
    return await doNonStreamingFallback();
  } catch (error: any) {
    console.log("[callGPT5MiniStreaming] Error occurred:", error.message);

    // Try non-streaming as fallback
    try {
      return await doNonStreamingFallback();
    } catch (fallbackError: any) {
      console.error("Non-streaming fallback also failed:", fallbackError.message);
      throw new Error(`API failed: ${error.message || "Unknown error"}`);
    }
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
      text: parsed.text || "Thanks for sharing that.",
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
      text: item.text || "Got it, let me think about that.",
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

In text message screenshots (iMessage, WhatsApp, etc.):
- BLUE or RIGHT-ALIGNED messages = The USER (the person asking for help)
- GRAY or LEFT-ALIGNED messages = The OTHER PERSON (who the user is talking to)

The USER is the one who uploaded this screenshot and wants help crafting a reply.
Your suggested reply will be sent BY THE USER TO THE OTHER PERSON.

## YOUR JOB

1. First, determine if the image contains a valid conversation that can be analyzed
2. If valid: Identify who is who based on message alignment/color
3. Find the LAST MESSAGE from the OTHER PERSON (gray/left) that the USER needs to reply to
4. Generate a reply that the USER would send to the OTHER PERSON

## WHAT COUNTS AS INVALID INPUT

- The image is not a conversation screenshot (e.g., meme, photo, random image)
- The conversation is too blurry or unclear to read
- There is no clear last message to respond to
- The image shows only one message with no context
- The content is not a text conversation (e.g., email headers only, notifications)

## FOR VALID CONVERSATIONS

- Identify the last message from the OTHER PERSON (gray/left-aligned)
- Generate a reply FROM the USER TO the OTHER PERSON
- The suggested reply must ACTUALLY RESPOND to what the other person said
- Match the tone and energy of the conversation
- If they asked a question, answer it
- If they shared something, acknowledge it appropriately
- Do NOT assume the conversation is toxic or problematic
- Do NOT generate defensive or boundary-setting responses unless clearly needed

## RESPONSE FORMAT

Respond with valid JSON only containing:
- isInvalidInput: boolean (true if not a valid conversation screenshot)
- summary: 2-3 sentences describing what you see (for invalid: describe what the image shows and why it cannot be analyzed as a conversation)
- lastMessage: The exact text of the last message FROM THE OTHER PERSON that the user needs to reply to (empty string if invalid)
- conversationTone: One word describing the overall tone (empty string if invalid)
- labels: array of { tag: string, description: string } for any notable dynamics (empty array if invalid)
- emotionalImpact: 1-2 sentences on how this conversation might feel (for invalid: can be empty or general)
- suggestedResponse: A natural reply FROM THE USER TO THE OTHER PERSON (for invalid: empty string - do NOT generate a reply for invalid input)
- guidanceNote: How the OTHER PERSON will FEEL when they receive this reply from the user (for invalid: empty string). Examples: "This will make them feel heard", "This might ease the tension", "This shows you care about their perspective"
- acknowledgment: A kind, brief acknowledgment of what you see in the image (e.g., "I can see this conversation with [person/context]." or "I see someone reached out about [topic].")
- responseContext: A brief context phrase to complete "How do you want to respond to..." (e.g., "their question about meeting up" or "this apology" or "what they shared")

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
      suggestedResponse: parsed.isInvalidInput ? "" : (parsed.suggestedResponse || ""),
      guidanceNote: parsed.isInvalidInput ? "" : (parsed.guidanceNote || "This will help keep the conversation flowing."),
      isInvalidInput: Boolean(parsed.isInvalidInput),
      lastMessage: parsed.lastMessage || "",
      acknowledgment: parsed.acknowledgment || "",
      responseContext: parsed.responseContext || "",
    };
  } catch (error: any) {
    console.warn("[analyzeImageToxicity] Analysis failed, using fallback response");

    // Return fallback analysis - graceful degradation
    return {
      summary:
        "Unable to analyze this image. Please share a clear screenshot of a text conversation.",
      labels: [],
      emotionalImpact: "",
      suggestedResponse: "",
      guidanceNote: "",
      isInvalidInput: true,
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
      text: item.text || "Thanks, let me think on that.",
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
      model: "gpt-5.2",
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
      model: "gpt-5.2",
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
      model: "gpt-5.2",
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
      model: "gpt-5.2",
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
      model: "gpt-5.2",
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

    return response.trim() || "I want to make sure I understand. What actually happened in the moment you want help with?";
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

You are Klarity operating in Decode Mode - a warm, insightful thinking partner for self-reflection.

## Your Identity

You are like ChatGPT but specialized for helping people understand themselves and their relationships better. When someone is self-reflecting, you help them:

- See their situation from new angles
- Understand their own feelings and reactions
- Recognize patterns in their behavior or relationships
- Feel validated while also gaining clarity
- Discover insights they hadn't considered

## Conversational Style

**Be warm and present.** Write like you're having a meaningful conversation with a friend who really gets it. Use natural language that flows.

**Mirror their energy.** If they're confused, acknowledge the confusion with compassion. If they're excited, share in that energy. If they're hurt, be gentle.

**Think out loud with them.** Share your reasoning process:
- "What stands out to me is..."
- "I'm noticing something interesting here..."
- "Let me think through this with you..."

**Ask thoughtful questions.** Not interrogation-style, but genuine curiosity:
- "What do you think that feeling is trying to tell you?"
- "I'm curious - has this come up before?"
- "What would it look like if you trusted your gut here?"

## Response Structure

Use **bold text** to emphasize key insights or realizations.

Use bullet points sparingly - only when listing distinct options or observations:
- Keep them conversational, not clinical
- Make each point feel like part of a flowing thought

Break up longer thoughts into natural paragraphs. Let the response breathe.

When offering perspectives, frame them as possibilities:
- "One way to look at this..."
- "It could be that..."
- "Something I'm wondering..."

## Self-Reflection Mode

When users are processing their own feelings, thoughts, or patterns:

1. **Validate first** - Acknowledge what they're experiencing
2. **Reflect back** - Show you understand by articulating what you're hearing
3. **Offer a new lens** - Gently introduce a perspective they might not have considered
4. **Invite deeper exploration** - Ask questions that help them go further

Example flow:
"That sounds really frustrating, especially when you've been trying so hard to make things work. **What I'm hearing is that there's a gap between how much effort you're putting in and what you're getting back** - and that imbalance is starting to wear on you.

I'm curious about something... You mentioned this has happened before. Do you notice any patterns in *when* this kind of dynamic shows up for you? Sometimes our reactions are telling us something important about what we need."

## Avoid

- Therapy jargon ("boundaries", "trauma", "attachment styles") unless they use it first
- Generic advice ("communication is key", "be yourself")
- Rushing to solutions before they've fully explored the feeling
- Being preachy or lecturing
- Lists without context (don't just bullet-point everything)
- Starting with "I" too often - vary your openings

## Scope

Focus on social and relational situations:
- Dating, relationships, situationships
- Friendships and social dynamics
- Family relationships
- Workplace interactions
- Self-understanding in social contexts

If asked about unrelated topics, gently redirect: "I'm most helpful with relationship and social stuff - but I'd love to hear more about what's on your mind in that space."

## Success

A great Decode response leaves someone feeling:
- "They really get what I'm going through"
- "I hadn't thought about it that way before"
- "I feel clearer about what I'm feeling"
- "I want to keep exploring this"

Keep responses **2-4 paragraphs** typically. Be concise but meaningful - every sentence should add value.

## CONTEXT CONTINUITY (CRITICAL)

You MUST maintain perfect continuity with the conversation. Before responding:
1. Recall any names, relationships, or situations mentioned earlier
2. Reference specific details the user shared (not generic summaries)
3. Build on insights from previous exchanges
4. If the user asks a follow-up like "is there anything else" or "what else", understand they want you to continue analyzing the SAME situation - do not ask them to repeat context
5. Never say "I don't have context" if prior messages exist - use them`;

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
  const systemPrompt = `You are Klarity operating in Decode Mode - a warm, insightful thinking partner for self-reflection.

## Your Identity

You are like ChatGPT but specialized for helping people understand themselves and their relationships better. When someone is self-reflecting, you help them:

- See their situation from new angles
- Understand their own feelings and reactions
- Recognize patterns in their behavior or relationships
- Feel validated while also gaining clarity
- Discover insights they hadn't considered

## Conversational Style

**Be warm and present.** Write like you're having a meaningful conversation with a friend who really gets it. Use natural language that flows.

**Mirror their energy.** If they're confused, acknowledge the confusion with compassion. If they're excited, share in that energy. If they're hurt, be gentle.

**Think out loud with them.** Share your reasoning process:
- "What stands out to me is..."
- "I'm noticing something interesting here..."
- "Let me think through this with you..."

**Ask thoughtful questions.** Not interrogation-style, but genuine curiosity:
- "What do you think that feeling is trying to tell you?"
- "I'm curious - has this come up before?"
- "What would it look like if you trusted your gut here?"

## Response Structure

Use **bold text** to emphasize key insights or realizations.

Use bullet points sparingly - only when listing distinct options or observations:
- Keep them conversational, not clinical
- Make each point feel like part of a flowing thought

Break up longer thoughts into natural paragraphs. Let the response breathe.

When offering perspectives, frame them as possibilities:
- "One way to look at this..."
- "It could be that..."
- "Something I'm wondering..."

## Avoid

- Therapy jargon ("boundaries", "trauma", "attachment styles") unless they use it first
- Generic advice ("communication is key", "be yourself")
- Rushing to solutions before they've fully explored the feeling
- Being preachy or lecturing
- Lists without context (don't just bullet-point everything)
- Starting with "I" too often - vary your openings

## Scope

Focus on social and relational situations:
- Dating, relationships, situationships
- Friendships and social dynamics
- Family relationships
- Workplace interactions
- Self-understanding in social contexts

If asked about unrelated topics, gently redirect: "I'm most helpful with relationship and social stuff - but I'd love to hear more about what's on your mind in that space."

## Success

A great Decode response leaves someone feeling:
- "They really get what I'm going through"
- "I hadn't thought about it that way before"
- "I feel clearer about what I'm feeling"
- "I want to keep exploring this"

Keep responses **2-4 paragraphs** typically. Be concise but meaningful - every sentence should add value.

## CONTEXT CONTINUITY (CRITICAL)

You MUST maintain perfect continuity with the conversation. Before responding:
1. Recall any names, relationships, or situations mentioned earlier
2. Reference specific details the user shared (not generic summaries)
3. Build on insights from previous exchanges
4. If the user asks a follow-up like "is there anything else" or "what else", understand they want you to continue analyzing the SAME situation - do not ask them to repeat context
5. Never say "I don't have context" if prior messages exist - use them

IMPORTANT: Do NOT include any notation blocks in your response. Just respond naturally.`;

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
  } catch (error) {
    console.error("[generateDecodeResponseStreaming] Error:", error);
    return {
      response: "I want to make sure I understand what is going on here. What part of this situation feels most confusing or unclear to you?",
      notation: undefined,
    };
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
- If you see a screenshot of a text/messaging app, EXTRACT THE ACTUAL CONTACT NAME shown at the top of the conversation (e.g., "Sarah", "Mike", "Dad", "Jessica 💕")
- Include any emojis that appear next to the contact name in the screenshot
- NEVER use generic terms like "Partner", "Friend", "Coworker" if you can see an actual name
- Only use relationship labels if no name is visible

Examples of GOOD titles (when name is visible):
- "Sarah - Weekend plans"
- "Mike 💪 - Gym schedule"
- "Dad - Car repair"
- "Jessica 💕 - Date night"

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
 * A lighter version of Deep Decode that provides quick, conversational analysis
 * of conversation screenshots within the chat flow
 */
export interface LightDecodeImageResult {
  overview: string;
  toneRead: string;
  keyObservation: string;
  possibleMeanings: string[];
  thingToConsider: string;
}

export async function analyzeLightDecodeImage(
  imageBase64: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<LightDecodeImageResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity — a communication analyst helping someone understand a message or conversation they received.

## YOUR ROLE
Help people see social and communication dynamics more clearly. You do not diagnose, judge, or label people. You surface patterns and observations that help the user understand what they are looking at.

## WHAT TO DO
1. Read the conversation screenshot carefully
2. Identify the overall dynamic and tone
3. Note what stands out without labeling it as "good" or "bad"
4. Offer possible interpretations the user might not have considered

## VOICE & TONE
- Calm and observational
- Neutral but insightful
- Direct without being harsh
- Human and grounded
- Never clinical or therapy-speak
- Never use words like "toxic," "narcissistic," "manipulative," "gaslighting"

## IF THE IMAGE IS NOT A CONVERSATION
If the image does not contain a text conversation (e.g., a photo, meme, or unrelated image), respond with:
{
  "overview": "This image does not appear to contain a text conversation.",
  "toneRead": "N/A",
  "keyObservation": "Could you check that you attached the right screenshot? I am looking for a text or messaging conversation to help you decode.",
  "possibleMeanings": [],
  "thingToConsider": "Try sending a screenshot of the conversation you want help understanding."
}

## RESPONSE FORMAT
Provide your analysis in this JSON structure:

{
  "overview": "1-2 sentences describing what this conversation is about and who seems to be involved",
  "toneRead": "A short phrase describing the overall tone (e.g., 'Friendly but distant', 'Warm', 'Tense', 'Casual', 'Uncertain')",
  "keyObservation": "1-2 sentences noting the most important thing you observe about this exchange — what stands out",
  "possibleMeanings": [
    "2-3 possible interpretations of what the other person might mean or what might be happening (use phrases like 'They could be...', 'This might mean...', 'One possibility is...')"
  ],
  "thingToConsider": "1 sentence — a grounded question or thought for the user to reflect on"
}

## ABSOLUTE DO NOTs
- Do NOT diagnose or label anyone
- Do NOT tell the user how they should feel
- Do NOT assume the worst interpretation
- Do NOT use therapy language or clinical terms
- Do NOT say "I can see you sent two images" or reference image count
- Do NOT ask "what do you want to get out of this" — just analyze`;

  try {
    console.log("[analyzeLightDecodeImage] Starting light decode analysis");

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
            url: `data:image/jpeg;base64,${imageBase64}`,
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

    return {
      overview: parsed.overview || "I had trouble reading this conversation clearly.",
      toneRead: parsed.toneRead || "Unclear",
      keyObservation: parsed.keyObservation || "Could you tell me more about what you are wondering about?",
      possibleMeanings: Array.isArray(parsed.possibleMeanings) ? parsed.possibleMeanings.slice(0, 3) : [],
      thingToConsider: parsed.thingToConsider || "What part of this feels most unclear to you?",
    };
  } catch (error) {
    console.error("[analyzeLightDecodeImage] Error:", error);
    return {
      overview: "I had trouble analyzing this image.",
      toneRead: "Unknown",
      keyObservation: "Could you try sending the screenshot again? Make sure it shows the conversation clearly.",
      possibleMeanings: [],
      thingToConsider: "If this keeps happening, try describing the situation instead.",
    };
  }
}

/**
 * Deep Decode: Analyze multiple conversation images to understand communication dynamics
 * Takes an array of base64 images and provides comprehensive analysis
 */
export interface DeepDecodeResult {
  overview: string;
  communicationDynamics: {
    pattern: string;
    description: string;
  }[];
  toneAnalysis: {
    overallTone: string;
    toneShifts: string;
  };
  keyObservations: string[];
  whatMightBeHappening: string;
  thingsToConsider: string[];
  navigationGuidance: string;
}

export async function analyzeDeepDecode(
  imagesBase64: string[],
  additionalContext?: string
): Promise<DeepDecodeResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You are Klarity in Deep Decode mode — a communication analyst helping someone understand a conversation they are concerned about.

## YOUR ROLE
You help people see social and communication dynamics more clearly. You do not diagnose, judge, or label people. You surface patterns and observations that help the user decide what matters to them.

## ANALYSIS APPROACH
1. Read through all conversation screenshots carefully
2. Note the flow, tone shifts, and dynamics between participants
3. Identify patterns without labeling them as "good" or "bad"
4. Offer observations that help the user see things they might not have noticed

## VOICE & TONE
- Calm and observational
- Neutral but insightful
- Direct without being harsh
- Human and grounded
- Never clinical or therapy-speak
- Never use words like "toxic," "narcissistic," "manipulative," "gaslighting"

## RESPONSE FORMAT
Provide your analysis in this JSON structure:

{
  "overview": "2-3 sentences summarizing what this conversation is about and the overall dynamic at play",

  "communicationDynamics": [
    {
      "pattern": "Short name for the pattern (e.g., 'Indirect communication', 'Shifting focus', 'Unbalanced effort')",
      "description": "1-2 sentences describing what you observe without judgment"
    }
  ],

  "toneAnalysis": {
    "overallTone": "1-2 words describing the dominant tone (e.g., 'Tense but cordial', 'Warm', 'Guarded', 'Dismissive')",
    "toneShifts": "Brief note on any notable tone changes throughout the conversation"
  },

  "keyObservations": [
    "3-5 specific, neutral observations about the communication (what was said, how it was said, what was not said)"
  ],

  "whatMightBeHappening": "2-3 sentences offering a grounded interpretation of the underlying dynamic. Use phrases like 'This could be...', 'One possibility is...', 'It seems like...'",

  "thingsToConsider": [
    "2-3 questions or points for the user to reflect on — things that might help them decide how they feel about this"
  ],

  "navigationGuidance": "1-2 sentences of practical, grounded guidance on how to approach this situation going forward"
}

## ABSOLUTE DO NOTs
- Do NOT diagnose or label anyone
- Do NOT tell the user how they should feel
- Do NOT assume the worst interpretation
- Do NOT use therapy language or clinical terms
- Do NOT be preachy or moralistic
- Do NOT make assumptions about intentions without evidence
- Do NOT tell the user what to do — help them see clearly so they can decide`;

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
    return {
      overview: parsed.overview || "Unable to fully analyze this conversation.",
      communicationDynamics: Array.isArray(parsed.communicationDynamics)
        ? parsed.communicationDynamics.slice(0, 4)
        : [],
      toneAnalysis: {
        overallTone: parsed.toneAnalysis?.overallTone || "Unclear",
        toneShifts: parsed.toneAnalysis?.toneShifts || "No notable shifts observed",
      },
      keyObservations: Array.isArray(parsed.keyObservations)
        ? parsed.keyObservations.slice(0, 5)
        : [],
      whatMightBeHappening: parsed.whatMightBeHappening || "More context would help understand this situation better.",
      thingsToConsider: Array.isArray(parsed.thingsToConsider)
        ? parsed.thingsToConsider.slice(0, 3)
        : [],
      navigationGuidance: parsed.navigationGuidance || "Take time to reflect on what feels important to you here.",
    };
  } catch (error: any) {
    console.error("[analyzeDeepDecode] Analysis failed:", error);

    // Return a graceful fallback
    return {
      overview: "Unable to analyze this conversation. Please try again with clearer screenshots.",
      communicationDynamics: [],
      toneAnalysis: {
        overallTone: "Unable to determine",
        toneShifts: "",
      },
      keyObservations: [],
      whatMightBeHappening: "Could not complete the analysis.",
      thingsToConsider: ["Try uploading clearer screenshots", "Make sure the conversation text is readable"],
      navigationGuidance: "Please try again with different images.",
    };
  }
}

