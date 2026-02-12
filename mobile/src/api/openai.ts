/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the OpenAI API. You may update this service, but you should not need to.

valid model names:
gpt-4.1-2025-04-14
o4-mini-2025-04-16
gpt-4o-2024-11-20
*/
import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export const getOpenAIClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
  console.log("[OpenAI] Initializing client, API key present:", !!apiKey, "key length:", apiKey?.length || 0);

  if (!apiKey) {
    console.error("[OpenAI] API key not found in environment variables!");
  }

  cachedClient = new OpenAI({
    apiKey: apiKey || "missing-key",
    dangerouslyAllowBrowser: true, // Required for React Native / browser environments
  });

  return cachedClient;
};
