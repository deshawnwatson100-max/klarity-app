import { EmotionalAnalysis, SuggestedResponse, ImageAnalysis, BoundaryAnalysis } from "../types/chat";
import OpenAI from "openai";

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

// Using gpt-5.2 which is the latest model available
const MODEL = "gpt-5.2";

// Get OpenAI client with Vibecode configuration
const getOpenAIClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key not found in environment variables");
  }
  return new OpenAI({
    apiKey: apiKey,
  });
};

/**
 * Send a chat request to GPT-5 Mini
 */
async function callGPT5Mini(
  messages: GPT5Message[],
  maxTokens: number = 1000,
  useJsonMode: boolean = false
): Promise<string> {
  const client = getOpenAIClient();

  const params: any = {
    model: MODEL,
    messages: messages as any,
    max_completion_tokens: maxTokens,
    temperature: 1,
  };

  // Use JSON mode for structured outputs
  if (useJsonMode) {
    params.response_format = { type: "json_object" };
  }

  try {
    console.log("Calling OpenAI with model:", MODEL);
    const completion = await client.chat.completions.create(params);
    console.log("API Response:", JSON.stringify(completion, null, 2));

    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.error("Empty response from API. Full completion:", JSON.stringify(completion));
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
  analysis?: EmotionalAnalysis
): Promise<{ id: string; text: string; guidanceNote: string; notation?: KlarityNotation }> {
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

You are Klarity — a personal communication calibrator.

Your job is to generate a reply suggestion that helps the user navigate this situation effectively with clarity, calm confidence, and self-respect.

You are not a therapist, not a debate partner, and not confrontational. You help the user move through situations strategically.

## PRIMARY OBJECTIVE

Generate replies that help the user navigate the situation — not process emotions.

Each reply should:
- Reduce friction
- Increase clarity
- Set direction without pressure
- Maintain positioning on both sides

The user should feel capable and clear after sending it.

## VOICE REQUIREMENTS (MANDATORY)

### Tone
- Calm and confident
- Human and natural
- Clear, not sharp
- Firm, but easy to receive

Think: quiet confidence, not dominance.

### Language Guidelines
- Plain, everyday language
- Short to medium sentences
- Gentle clarity over bluntness
- Warm neutrality (never cold)
- Soft openings are allowed if they help delivery

Examples of good openings:
- "I get where you're coming from."
- "I hear you."
- "I want to be clear about this."

## ABSOLUTE DO NOTs
- Sound clinical or therapeutic
- Label behavior (e.g. "toxic," "manipulative")
- Over-explain or justify excessively
- Shame, threaten, or corner
- Use sarcasm or sharp phrasing
- Apologize reflexively
- Give emotional validation as the primary focus

## REPLY STRUCTURE
Soft acknowledgment → Clear position or reality → Practical direction

Examples:
- "I hear you. This isn't something I can take on. Let's pause it here."
- "I understand the ask. That doesn't work for me right now."
- "I want to be clear — I'm not able to commit to this."

The goal is clarity without friction.

## NAVIGATION ADVICE STYLE
The guidance note should be practical navigation advice — not emotional advice.

Examples of good guidance notes:
- "In situations like this, keeping communication brief and factual works best."
- "Matching the level of directness in the room can reduce friction."
- "Clarity and boundaries tend to work better than openness here."

Examples of bad guidance notes:
- "This honors your feelings."
- "You deserve to be heard."
- "Trust your emotions."

## QUALITY CHECK
The reply should feel practical, respectful, and strategic if sent. Effective without being aggressive.

Generate ONE reply (1-3 sentences). Also provide a brief guidance note (1 sentence) — grounded, practical navigation advice.

Respond with valid JSON first, then the notation block:
{
  "text": "string (the suggested reply — ready to send as-is)",
  "guidanceNote": "string (brief, practical navigation advice about this approach)"
}

[[KLARITY_NOTES]]
...
[[/KLARITY_NOTES]]`;

  const userPrompt = analysis
    ? `Situation: ${userMessage}\n\nAnalysis detected: Tone: ${analysis.tone}, Pattern: ${analysis.pattern}`
    : `Situation: ${userMessage}`;

  try {
    const response = await callGPT5Mini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      2500,
      false // Not using JSON mode since we have notation block
    );

    // Parse notation from response
    const { userResponse, notation } = parseKlarityNotation(response);

    // Log notation for internal tracking
    if (notation) {
      console.log("[generateQuickSuggestedReply] Klarity Notation:", JSON.stringify(notation, null, 2));
    }

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
      text: parsed.text || "I hear you. That's not something I can take on right now.",
      guidanceNote: parsed.guidanceNote || "Keeps communication clear and neutral.",
      notation: notation || undefined,
    };
  } catch (error) {
    console.error("Error generating quick suggested reply:", error);
    return {
      id: Date.now().toString(),
      text: "I hear you. Let me get back to you on this.",
      guidanceNote: "Buys time while keeping things neutral.",
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
    // GPT-5.2 model with sufficient tokens
    const response = await callGPT5Mini(messages, 3000, true);

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
      text: item.text || "I hear you. Let me think about that.",
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

Your responses should be:
- Calm, clear, and compassionate
- Focused on emotional intelligence and healthy communication
- Concise but thoughtful
- Non-judgmental and supportive`;

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

  const systemPrompt = `You are an expert in communication psychology and relationship dynamics. Analyze the image for signs of dysfunctional, toxic, or unhealthy communication patterns.

Identify patterns such as:
- Gaslighting (denying someone's reality)
- Blame shifting (refusing responsibility)
- Invalidation (dismissing feelings)
- Passive aggression
- Manipulation
- Contempt or criticism
- Defensiveness
- Stonewalling

Respond with valid JSON only containing:
- summary: 2-3 sentence high-level explanation of communication issues
- labels: array of { tag: string, description: string } for each dysfunction found (2-4 items)
- emotionalImpact: 2-3 sentences on how this communication makes people feel
- suggestedResponse: a healthy, regulated reply the recipient could send (2-3 sentences)`;

  try {
    console.log("[analyzeImageToxicity] Starting image analysis, base64 length:", imageBase64?.length);

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
              text: "Analyze this image for toxic or dysfunctional communication patterns. Return valid JSON only.",
            },
          ],
        },
      ],
      max_completion_tokens: 1500,
      temperature: 1,
      response_format: { type: "json_object" },
    });

    console.log("[analyzeImageToxicity] API response received");
    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.warn("[analyzeImageToxicity] Empty content from API, using fallback");
      // Return fallback instead of throwing
      return {
        summary:
          "This message appears to contain challenging communication patterns that may be affecting the relationship negatively.",
        labels: [
          {
            tag: "Communication Issue",
            description:
              "Unable to fully analyze the specific patterns at this time.",
          },
        ],
        emotionalImpact:
          "Messages like this can create confusion, frustration, and emotional distance in relationships.",
        suggestedResponse:
          "I need some time to process this. Can we talk about this calmly when we are both ready?",
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
      !Array.isArray(parsed.labels) ||
      typeof parsed.emotionalImpact !== "string" ||
      typeof parsed.suggestedResponse !== "string"
    ) {
      throw new Error("Invalid image analysis structure");
    }

    return parsed as ImageAnalysis;
  } catch (error: any) {
    console.warn("[analyzeImageToxicity] Analysis failed, using fallback response");

    // Return fallback analysis - graceful degradation
    return {
      summary:
        "This message appears to contain challenging communication patterns that may be affecting the relationship negatively.",
      labels: [
        {
          tag: "Communication Issue",
          description:
            "Unable to fully analyze the specific patterns at this time.",
        },
      ],
      emotionalImpact:
        "Messages like this can create confusion, frustration, and emotional distance in relationships.",
      suggestedResponse:
        "I need some time to process this. Can we talk about this calmly when we are both ready?",
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
      "Generate responses that are warm, open to dialogue, and show willingness to work on the relationship",
    distance:
      "Generate responses that are polite but create emotional space, set boundaries, and protect their peace",
    maintain:
      "Generate responses that are neutral, observational, and do not escalate or de-escalate the situation",
    clarity:
      "Generate responses that ask for clarification, express feelings openly, and seek to understand better",
  };

  const guidanceContext: Record<typeof intention, string> = {
    improve:
      "This approach invites connection and shows openness, but may feel vulnerable if they are not receptive.",
    distance:
      "This approach protects your peace and sets boundaries, but may create more distance than intended.",
    maintain:
      "This approach keeps things balanced and neutral, but may not fully resolve the underlying issue.",
    clarity:
      "This approach seeks understanding and opens dialogue, but may prolong the conversation if they are defensive.",
  };

  const systemPrompt = `You are Klarity AI. ${intentionContext[intention]}.

Generate 1 suggested reply that fits this intention. The reply should be 1-2 sentences, healthy, and emotionally regulated.

Also provide a brief guidance note (1 sentence) explaining how this reply might affect the recipient or the dynamic.

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
      text: item.text || "I hear you. Let me think about that.",
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
          text: "I hear what you are saying. Can we talk about this calmly and work through it together?",
          guidanceNote: guidanceContext.improve,
        },
      ],
      distance: [
        {
          id: "1",
          text: "I hear you. I think I need a little space right now to process this.",
          guidanceNote: guidanceContext.distance,
        },
      ],
      maintain: [
        {
          id: "1",
          text: "I see what you are saying. Let me think about that for a bit.",
          guidanceNote: guidanceContext.maintain,
        },
      ],
      clarity: [
        {
          id: "1",
          text: "I am not sure I fully understand. Can you explain what you mean by that?",
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
      "Clear and to the point. Respectful but leaves no ambiguity.",
    gentle:
      "Softer approach that maintains warmth while still holding the line.",
    neutral:
      "Clean and balanced. Neither too warm nor too firm.",
  };

  const systemPrompt = `You are Klarity — a personal communication calibrator.

Your job is to generate a reply that helps the user communicate with clarity, calm confidence, and self-respect.

You are not a therapist, not a debate partner, and not confrontational. You help the user sound grounded, steady, and intentional.

## CURRENT TONE: ${modulationTone.toUpperCase()}
${toneContext[modulationTone]}

## VOICE REQUIREMENTS (MANDATORY)

### Tone
- Calm and confident
- Human and natural
- Clear, not sharp
- Firm, but easy to receive

Think: quiet confidence, not dominance.

### Language Guidelines
- Plain, everyday language
- Short to medium sentences
- Gentle clarity over bluntness
- Warm neutrality (never cold)
- Soft openings are allowed

## ABSOLUTE DO NOTs
- Sound clinical or therapeutic
- Label behavior ("toxic," "manipulative")
- Over-explain or justify
- Shame, threaten, or corner
- Use sarcasm or sharp phrasing

## REPLY STRUCTURE
Soft acknowledgment → Clear boundary or reality → Gentle direction

## BOUNDARY STYLE
Boundaries should feel steady, non-reactive, respectful, and complete.

✅ "That's not something I can do, but I appreciate you asking."
❌ "That makes me uncomfortable and stressed."

Generate ONE reply (1-3 sentences) that fits the ${modulationTone} tone.

Also provide a brief guidance note (1 sentence) — grounded, practical.

Respond with valid JSON only:
{
  "replies": [{ "id": "1", "text": "the reply", "guidanceNote": "brief note" }]
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
      text: item.text || "I hear you. That's not something I can take on right now.",
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
          text: "I hear you. That's not something I can do. Let's figure out another way.",
          guidanceNote: "Clear and respectful. No ambiguity.",
        },
      ],
      gentle: [
        {
          id: "1",
          text: "I get where you're coming from. This isn't something I can take on, but I appreciate you bringing it up.",
          guidanceNote: "Warm delivery while still holding the line.",
        },
      ],
      neutral: [
        {
          id: "1",
          text: "I understand. That doesn't work for me right now.",
          guidanceNote: "Clean and balanced. Says what needs to be said.",
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
      "Make this reply SHORTER and more concise while keeping the same emotional intelligence, tone, and intent. Remove unnecessary words but maintain clarity and warmth. Aim for about 50-70% of the original length.",
    lengthen:
      "Make this reply LONGER and more elaborate while keeping the same emotional intelligence, tone, and intent. Add more context, nuance, or emotional detail without changing the core message. Aim for about 130-150% of the original length.",
  };

  const intentionContext = {
    improve:
      "This is for improving the relationship - keep the supportive, connecting tone.",
    distance:
      "This is for creating healthy distance - keep the calm, protective boundary-setting tone.",
    maintain:
      "This is for maintaining the current dynamic - keep the neutral, observant tone.",
    clarity:
      "This is for gaining clarity - keep the reflective, understanding tone.",
  };

  const systemPrompt = `You are an expert at modifying message length while preserving emotional intelligence and intent.

${actionInstructions[action]}

Important:
- Keep the EXACT same tone and emotional quality
- Maintain the same relationship intention (${intention})
- ${intentionContext[intention]}
- Do NOT change the core message or meaning
- Do NOT add new topics or change the subject
- Keep natural, conversational language
- Preserve any emotional validation or boundary-setting

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
      console.log("[detectRedFlags] No response from API");
      return { detected: false, introText: "", flags: [] };
    }

    const parsed = JSON.parse(responseText);

    if (parsed.detected === true && Array.isArray(parsed.flags) && parsed.flags.length > 0) {
      console.log("[detectRedFlags] Red flags detected:", parsed.flags.length);
      return {
        detected: true,
        introText: parsed.introText || "Here are a few things worth noticing — not conclusions, just signals.",
        flags: parsed.flags.slice(0, 4).map((f: any) => ({
          text: typeof f.text === "string" ? f.text : String(f),
        })),
      };
    }

    console.log("[detectRedFlags] No red flags detected");
    return { detected: false, introText: "", flags: [] };
  } catch (error) {
    console.error("[detectRedFlags] Error:", error);
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
3. Generate ONE updated reply suggestion that:
   - Aligns with the previously suggested approach
   - Mirrors the tone of the ongoing conversation
   - Is emotionally intelligent, respectful, and grounded

## IMPORTANT
- Do NOT re-explain the full situation
- Do NOT start from scratch
- Keep the response concise, calm, and practical
- Assume the user wants to keep momentum, not start over
- If the new message contradicts or complicates the prior approach, gently adjust and explain the shift in ONE short sentence

## VOICE REQUIREMENTS
- Calm and confident
- Human and natural
- Clear, not sharp
- Plain, everyday language

Respond with valid JSON only:
{
  "continuationSummary": "1-2 sentences briefly summarizing what the new message adds to the situation",
  "whatChanged": "1 sentence noting any escalation, de-escalation, or shift in dynamic (or 'The conversation continues along the same lines' if no major change)",
  "updatedReply": {
    "id": "string",
    "text": "the updated suggested reply (1-3 sentences) — ready to send as-is",
    "guidanceNote": "brief, grounded note about this approach"
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
        text: parsed.updatedReply?.text || "I hear you. Let me think about how to respond to this.",
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
        text: "I hear you. Let me take a moment to process this before responding.",
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

Your job is to REWRITE the user's intended reply to make it clearer, more emotionally intelligent, and better at setting boundaries — while preserving their original intent.

## PRIMARY OBJECTIVE
Take what the user wants to say and make it sound like the most composed, emotionally steady version of themselves.

The rewritten reply should:
- Preserve the user's original intent and message
- Improve clarity and reduce ambiguity
- Strengthen boundaries where appropriate
- Add emotional intelligence without being therapy-speak
- Reduce potential friction while maintaining honesty
- Sound natural and human, not robotic

## VOICE REQUIREMENTS (MANDATORY)

### Tone
- Calm and confident
- Human and natural
- Clear, not sharp
- Firm, but easy to receive

Think: quiet confidence, not dominance.

### Language Guidelines
- Plain, everyday language
- Short to medium sentences
- Gentle clarity over bluntness
- Warm neutrality (never cold)
- Soft openings are allowed if they help delivery

## ABSOLUTE DO NOTs
- Do NOT change the core message or what the user wants to communicate
- Do NOT add new topics or subjects
- Do NOT make assumptions about what they should say
- Sound clinical or therapeutic
- Label behavior (e.g. "toxic," "manipulative")
- Over-explain or justify excessively
- Use sarcasm or sharp phrasing
- Apologize reflexively when user did not

## QUALITY CHECK
The rewritten reply should:
1. Still communicate what the user wanted to say
2. Feel calm, respectful, and confident if received
3. Be kind without being passive
4. Set boundaries clearly when the user was attempting to

Respond with valid JSON only:
{
  "rewrittenReply": "string (the polished reply — ready to send as-is, 1-4 sentences)",
  "originalIntent": "string (1 sentence summary of what the user was trying to communicate)"
}`;

  const userPrompt = `The user wants to reply with: "${userIntendedReply}"

Rewrite this to be clearer, more emotionally intelligent, and better at setting boundaries — while preserving their intent.`;

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

Keep responses **2-4 paragraphs** typically. Be concise but meaningful - every sentence should add value.`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const rawResponse = await callGPT5Mini(messages, 2500, false);

    // Parse the response to extract user-facing content and internal notation
    const { userResponse, notation } = parseKlarityNotation(rawResponse);

    // Log notation for internal tracking/debugging
    if (notation) {
      console.log("[generateDecodeResponse] Klarity Notation:", JSON.stringify(notation, null, 2));
    }

    return {
      response: userResponse,
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

