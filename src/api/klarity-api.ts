import { EmotionalAnalysis, SuggestedResponse, ImageAnalysis } from "../types/chat";
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
    // o4-mini uses reasoning tokens + output tokens, need much more for reasoning models
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
    // o4-mini uses reasoning tokens + output tokens, need much more for reasoning models
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

  // o4-mini uses reasoning tokens, need much more for reasoning models
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
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.labels) ||
      typeof parsed.emotionalImpact !== "string" ||
      typeof parsed.suggestedResponse !== "string"
    ) {
      throw new Error("Invalid image analysis structure");
    }

    return parsed as ImageAnalysis;
  } catch (error: any) {
    console.error("Error analyzing image:", error);

    // Return fallback analysis
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
): Promise<Array<{ id: string; text: string }>> {
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

  const systemPrompt = `You are Klarity AI. ${intentionContext[intention]}.

Generate 2-3 suggested replies that fit this intention. Each reply should be 1-2 sentences, healthy, and emotionally regulated.

Respond with valid JSON only containing:
- replies: array of { id: string, text: string }`;

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

    return replies.slice(0, 3).map((item: any, index: number) => ({
      id: item.id || (index + 1).toString(),
      text: item.text || "I hear you. Let me think about that.",
    }));
  } catch (error) {
    console.error("Error generating intention-based replies:", error);

    // Return fallback replies based on intention
    const fallbacks: Record<
      typeof intention,
      Array<{ id: string; text: string }>
    > = {
      improve: [
        {
          id: "1",
          text: "I hear what you are saying. Can we talk about this calmly and work through it together?",
        },
        {
          id: "2",
          text: "I want to understand your perspective better. Can you help me see where you are coming from?",
        },
      ],
      distance: [
        {
          id: "1",
          text: "I hear you. I think I need a little space right now to process this.",
        },
        {
          id: "2",
          text: "I understand. Let me take some time to think about this, and we can talk later.",
        },
      ],
      maintain: [
        {
          id: "1",
          text: "I see what you are saying. Let me think about that for a bit.",
        },
        {
          id: "2",
          text: "Got it. I will keep that in mind as we move forward.",
        },
      ],
      clarity: [
        {
          id: "1",
          text: "I am not sure I fully understand. Can you explain what you mean by that?",
        },
        {
          id: "2",
          text: "I feel confused about this. Can we talk through it so I can understand better?",
        },
      ],
    };

    return fallbacks[intention];
  }
}


