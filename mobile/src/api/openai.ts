/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a client for the backend chat API. All OpenAI calls are routed through the backend
for security - the API key is never exposed to the mobile app.

The backend handles:
- API key management (server-side only)
- Rate limiting
- Request validation
*/

import { getBackendUrl } from "../lib/config";

// App client key for backend authentication (non-public, embedded in app)
const APP_CLIENT_KEY = "klarity-app-key-2024-secure";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url: string; detail?: "low" | "high" | "auto" };
  }>;
}

interface ChatRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: { type: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAICompletionParams = Record<string, any>;

interface ChatResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  requestId?: string;
}

/**
 * OpenAI-compatible client that routes through the backend
 * This mimics the OpenAI SDK interface for easy migration
 */
class BackendOpenAIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getBackendUrl();
  }

  chat = {
    completions: {
      create: async (params: OpenAICompletionParams): Promise<any> => {
        const { model, messages, temperature, max_tokens, max_completion_tokens, stream } = params;
        const effectiveMaxTokens = max_completion_tokens || max_tokens;

        if (stream) {
          // Return an async iterator for streaming
          return this.createStreamingResponse(messages, {
            model,
            temperature,
            maxTokens: effectiveMaxTokens,
          });
        }

        // Non-streaming request
        const response = await this.chatRequest(messages, {
          model,
          temperature,
          maxTokens: effectiveMaxTokens,
        });

        // Format response to match OpenAI SDK structure
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: response.text,
              },
              finish_reason: "stop",
            },
          ],
          usage: response.usage
            ? {
                prompt_tokens: response.usage.promptTokens,
                completion_tokens: response.usage.completionTokens,
                total_tokens: response.usage.totalTokens,
              }
            : undefined,
        };
      },
    },
  };

  private async chatRequest(
    messages: ChatMessage[],
    options?: ChatRequestOptions
  ): Promise<ChatResponse> {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/api/chat`;

    console.log("[OpenAI Client] Making chat request to backend:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APP-KEY": APP_CLIENT_KEY,
      },
      body: JSON.stringify({
        mode: "chat",
        messages,
        meta: {
          model: options?.model,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[OpenAI Client] Backend error:", errorData);
      throw new Error(
        (errorData as any)?.message || `Backend request failed: ${response.status}`
      );
    }

    const data = await response.json();
    return data as ChatResponse;
  }

  private async *createStreamingResponse(
    messages: ChatMessage[],
    options?: ChatRequestOptions
  ): AsyncGenerator<{ choices: Array<{ delta: { content?: string }; finish_reason?: string }> }> {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/api/chat`;

    console.log("[OpenAI Client] Making streaming request to backend:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APP-KEY": APP_CLIENT_KEY,
      },
      body: JSON.stringify({
        mode: "chat",
        messages,
        meta: {
          model: options?.model,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
          stream: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[OpenAI Client] Backend streaming error:", errorData);
      throw new Error(
        (errorData as any)?.message || `Backend request failed: ${response.status}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body for streaming");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.done) {
                yield {
                  choices: [{ delta: {}, finish_reason: "stop" }],
                };
              } else if (parsed.chunk) {
                yield {
                  choices: [{ delta: { content: parsed.chunk }, finish_reason: undefined }],
                };
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

let cachedClient: BackendOpenAIClient | null = null;

export const getOpenAIClient = (): BackendOpenAIClient => {
  if (cachedClient) {
    return cachedClient;
  }

  console.log("[OpenAI] Initializing backend client");
  cachedClient = new BackendOpenAIClient();
  return cachedClient;
};

/**
 * Direct chat request to backend (simpler interface)
 */
export const chatWithBackend = async (
  messages: ChatMessage[],
  options?: ChatRequestOptions
): Promise<ChatResponse> => {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    messages,
    model: options?.model,
    temperature: options?.temperature,
    max_tokens: options?.maxTokens,
    stream: false,
  });

  return {
    text: response.choices[0]?.message?.content || "",
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
};

// Export the APP_CLIENT_KEY for use in other API files
export { APP_CLIENT_KEY };
