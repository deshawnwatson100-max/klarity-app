import { EmotionalAnalysis, SuggestedResponse, ImageAnalysis, BoundaryAnalysis } from "../types/chat";
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
    console.error("[analyzeImageToxicity] Error:", error?.message || error);
    console.error("[analyzeImageToxicity] Error details:", {
      status: error?.status,
      code: error?.code,
      type: error?.type,
    });

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
 */
export async function generateModulatedReplies(
  userMessage: string,
  intention: "improve" | "distance" | "maintain" | "clarity",
  analysis: EmotionalAnalysis,
  modulationTone: "direct" | "gentle" | "neutral"
): Promise<Array<{ id: string; text: string; guidanceNote: string }>> {
  const toneContext: Record<typeof modulationTone, string> = {
    direct:
      "Generate replies that are clear, straightforward, and assertive. They should communicate boundaries or needs without hedging.",
    gentle:
      "Generate replies that are soft, empathetic, and non-confrontational. They should prioritize emotional safety and reduce tension.",
    neutral:
      "Generate replies that are balanced, calm, and emotionally neutral. They should avoid escalation while staying clear.",
  };

  const guidanceContext: Record<typeof modulationTone, string> = {
    direct:
      "Direct approaches bring clarity faster but may lead to pushback if the other person feels defensive. This works best when boundaries need to be clear.",
    gentle:
      "Gentle approaches may reduce tension and feel emotionally safer, but they might soften your boundary or make your needs less clear.",
    neutral:
      "Neutral keeps things simple and clean, but it may feel less emotionally validating or personally connected.",
  };

  const systemPrompt = `You are Klarity AI. ${toneContext[modulationTone]}

Generate 1 suggested reply that fits the ${modulationTone} tone and the user's intention (${intention}).

For each reply, also provide a short, calm guidance note (1-2 sentences) that helps the user understand the perspective or potential outcome of this approach. The guidance should be:
- Supportive and neutral, not fear-based
- Empowering autonomy, not prescriptive
- Focused on awareness, not warnings

Example guidance notes:
- "Just something to consider — this approach may reduce tension, but they may not fully hear your boundary."
- "More direct may bring clarity faster, but could lead to pushback if they're feeling defensive."
- "Neutral keeps things clean and simple, but may feel less emotionally validating."

Respond with valid JSON only containing:
- replies: array of { id: string, text: string, guidanceNote: string }`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Situation: ${userMessage}\n\nAnalysis: ${JSON.stringify(analysis)}\n\nGeneral guidance template: ${guidanceContext[modulationTone]}`,
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
      guidanceNote:
        item.guidanceNote || guidanceContext[modulationTone],
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
          text: "I need to be clear about this. What you said feels unfair to me, and I need us to talk about it directly.",
          guidanceNote:
            "This approach brings clarity quickly but may feel confrontational if they are feeling defensive.",
        },
      ],
      gentle: [
        {
          id: "1",
          text: "I hear what you are saying, and I want to understand your perspective better. Can we talk through this together?",
          guidanceNote:
            "This approach reduces tension and feels safer, but your boundary may not be as clear.",
        },
      ],
      neutral: [
        {
          id: "1",
          text: "I see what you mean. Let me think about this and get back to you.",
          guidanceNote:
            "Neutral keeps things simple and calm, but may feel less emotionally engaged.",
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
      model: "o4-mini-2025-04-16",
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
      model: "o4-mini-2025-04-16",
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
      model: "o4-mini-2025-04-16",
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
