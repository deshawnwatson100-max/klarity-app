import { EmotionalAnalysis, SuggestedResponse } from "../types/chat";
import OpenAI from "openai";

interface GPT5Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Using o4-mini which is the latest mini model available
const MODEL = "o4-mini-2025-04-16";

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
    const completion = await client.chat.completions.create(params);
    const content = completion.choices[0]?.message?.content || "";

    if (!content) {
      console.error("Empty response from API");
      throw new Error("Empty response from API");
    }

    return content;
  } catch (error: any) {
    console.error("API Error:", error.message || error);
    throw new Error(`GPT-5 Mini API failed: ${error.message || "Unknown error"}`);
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
- summary: string (1-2 calm sentences)`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    const response = await callGPT5Mini(messages, 400, true);

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
    const response = await callGPT5Mini(messages, 600, true);

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

  return callGPT5Mini(messages, 800);
}
