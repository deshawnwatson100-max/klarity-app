import { EmotionalAnalysis, SuggestedResponse } from "../types/chat";

interface GPT5Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const API_KEY = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-5-mini";

/**
 * Send a chat request to GPT-5 Mini
 */
async function callGPT5Mini(
  messages: GPT5Message[],
  maxTokens: number = 1000
): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_completion_tokens: maxTokens,
      temperature: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GPT-5 Mini API failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate emotional analysis for user message
 */
export async function generateEmotionalAnalysis(
  userMessage: string
): Promise<EmotionalAnalysis> {
  const systemPrompt = `You are an emotional intelligence assistant. Analyze the following message and provide:
1. Emotional clarity percentage (0-100)
2. Detected emotional state (1-3 words)
3. Relationship risk level (low/medium/high)
4. Brief summary (1-2 sentences, calm tone)

Return ONLY a JSON object with this exact structure:
{
  "emotionalClarity": <number>,
  "detectedState": "<string>",
  "relationshipRisk": "<low|medium|high>",
  "summary": "<string>"
}`;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const response = await callGPT5Mini(messages, 300);

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse emotional analysis");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate suggested responses based on user message and context
 */
export async function generateSuggestedResponses(
  userMessage: string,
  conversationHistory: string[]
): Promise<SuggestedResponse[]> {
  const systemPrompt = `You are an emotionally intelligent communication assistant. Based on the user's message, generate 3 suggested responses that are:
- Compassionate and emotionally aware
- Healthy and constructive
- Varied in tone (one softer, one direct, one playful)

Return ONLY a JSON array with this exact structure:
[
  {
    "id": "1",
    "text": "<response text>",
    "tone": "soften"
  },
  {
    "id": "2",
    "text": "<response text>",
    "tone": "direct"
  },
  {
    "id": "3",
    "text": "<response text>",
    "tone": "playful"
  }
]`;

  const contextMessage =
    conversationHistory.length > 0
      ? `Context:\n${conversationHistory.join("\n")}\n\nCurrent message: ${userMessage}`
      : userMessage;

  const messages: GPT5Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextMessage },
  ];

  const response = await callGPT5Mini(messages, 500);

  // Parse JSON array from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse suggested responses");
  }

  return JSON.parse(jsonMatch[0]);
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
