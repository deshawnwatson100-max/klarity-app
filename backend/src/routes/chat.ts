import { Hono } from "hono";
import { z } from "zod";

const chatRouter = new Hono();

// Rate limiting store (in-memory, per IP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

// Generate a unique request ID for error tracking
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Rate limiting middleware
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

// Request validation schema
const chatRequestSchema = z.object({
  mode: z.enum(["decode", "reply", "chat", "analyze"]),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.union([
        z.string(),
        z.array(
          z.union([
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({
              type: z.literal("image_url"),
              image_url: z.object({
                url: z.string(),
                detail: z.enum(["low", "high", "auto"]).optional(),
              }),
            }),
          ])
        ),
      ]),
    })
  ),
  meta: z
    .object({
      tone: z.string().optional(),
      context: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      stream: z.boolean().optional(),
      responseFormat: z.object({ type: z.string() }).optional(),
    })
    .optional(),
});

// POST /api/chat - Main chat endpoint
chatRouter.post("/", async (c) => {
  const requestId = generateRequestId();

  try {
    // 1. Validate X-APP-KEY header
    const appKey = c.req.header("X-APP-KEY");
    const expectedKey = process.env.APP_CLIENT_KEY;

    if (!appKey || appKey !== expectedKey) {
      console.log(`[Chat API] Unauthorized request - requestId: ${requestId}`);
      return c.json(
        { error: "Unauthorized", message: "Invalid or missing X-APP-KEY", requestId },
        401
      );
    }

    // 2. Rate limiting
    const clientIp =
      c.req.header("x-forwarded-for")?.split(",")[0] ||
      c.req.header("x-real-ip") ||
      "unknown";
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      console.log(`[Chat API] Rate limited - IP: ${clientIp}, requestId: ${requestId}`);
      return c.json(
        {
          error: "Rate Limited",
          message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          requestId,
        },
        429
      );
    }

    // 3. Parse and validate request body
    const body = await c.req.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      console.log(`[Chat API] Invalid request body - requestId: ${requestId}`, parseResult.error.issues);
      return c.json(
        {
          error: "Invalid Request",
          message: "Invalid request body",
          details: parseResult.error.issues.map((i) => i.message),
          requestId,
        },
        400
      );
    }

    const { mode, messages, meta } = parseResult.data;

    // 4. Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error(`[Chat API] Missing OPENAI_API_KEY - requestId: ${requestId}`);
      return c.json(
        { error: "Configuration Error", message: "Server misconfigured", requestId },
        500
      );
    }

    // Determine model based on mode or meta
    const model = meta?.model || "gpt-4o";
    const temperature = meta?.temperature ?? 0.7;
    const maxTokens = meta?.maxTokens || 4096;

    console.log(`[Chat API] Processing request - mode: ${mode}, model: ${model}, requestId: ${requestId}`);

    // Check if streaming is requested
    if (meta?.stream) {
      // Set up SSE headers
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");
      c.header("X-Request-ID", requestId);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Chat API] OpenAI streaming error - requestId: ${requestId}`, errorText);
        return c.json(
          { error: "AI Service Error", message: "Failed to get response from AI service", requestId },
          502
        );
      }

      // Stream the response
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let fullContent = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    controller.enqueue(`data: ${JSON.stringify({ done: true, text: fullContent })}\n\n`);
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || "";
                    if (content) {
                      fullContent += content;
                      controller.enqueue(`data: ${JSON.stringify({ chunk: content, text: fullContent })}\n\n`);
                    }
                  } catch {
                    // Skip unparseable lines
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Request-ID": requestId,
        },
      });
    }

    // Non-streaming request with retry logic
    // Build request body with optional response_format
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Pass response_format if specified (e.g., for JSON mode)
    if (meta?.responseFormat) {
      requestBody.response_format = meta.responseFormat;
    }

    // Retry logic for transient errors
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1000;
    let lastError: string = "";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = errorText;
          const statusCode = response.status;

          // Retry on 502, 503, 429 (rate limit), or 500 errors
          if ((statusCode === 502 || statusCode === 503 || statusCode === 429 || statusCode === 500) && attempt < MAX_RETRIES - 1) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
            console.log(`[Chat API] Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) - status: ${statusCode}, requestId: ${requestId}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          console.error(`[Chat API] OpenAI error - requestId: ${requestId}`, errorText);
          return c.json(
            { error: "AI Service Error", message: "Failed to get response from AI service", requestId },
            502
          );
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };
        const text = data.choices?.[0]?.message?.content || "";

        console.log(`[Chat API] Success - requestId: ${requestId}, response length: ${text.length}`);

        return c.json({
          text,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
              }
            : undefined,
          requestId,
        });
      } catch (fetchError) {
        lastError = String(fetchError);
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.log(`[Chat API] Network error, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}), requestId: ${requestId}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    console.error(`[Chat API] All retries failed - requestId: ${requestId}`, lastError);
    return c.json(
      { error: "AI Service Error", message: "Failed to get response from AI service after retries", requestId },
      502
    );
  } catch (error) {
    console.error(`[Chat API] Unexpected error - requestId: ${requestId}`, error);
    return c.json(
      { error: "Internal Server Error", message: "An unexpected error occurred", requestId },
      500
    );
  }
});

// POST /api/chat/responses - OpenAI Responses API (for web search)
chatRouter.post("/responses", async (c) => {
  const requestId = generateRequestId();

  try {
    // Validate X-APP-KEY header
    const appKey = c.req.header("X-APP-KEY");
    const expectedKey = process.env.APP_CLIENT_KEY;

    if (!appKey || appKey !== expectedKey) {
      return c.json({ error: "Unauthorized", message: "Invalid or missing X-APP-KEY", requestId }, 401);
    }

    // Rate limiting
    const clientIp = c.req.header("x-forwarded-for")?.split(",")[0] || c.req.header("x-real-ip") || "unknown";
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return c.json(
        {
          error: "Rate Limited",
          message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          requestId,
        },
        429
      );
    }

    const body = await c.req.json();
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return c.json({ error: "Configuration Error", message: "Server misconfigured", requestId }, 500);
    }

    console.log(`[Chat API Responses] Processing request - requestId: ${requestId}`);

    // Forward to OpenAI Responses API
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Chat API Responses] OpenAI error - requestId: ${requestId}`, errorText);
      return c.json(
        { error: "AI Service Error", message: "Failed to get response from AI service", requestId },
        502
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    console.log(`[Chat API Responses] Success - requestId: ${requestId}`);

    return c.json({ data, requestId });
  } catch (error) {
    console.error(`[Chat API Responses] Unexpected error - requestId: ${requestId}`, error);
    return c.json({ error: "Internal Server Error", message: "An unexpected error occurred", requestId }, 500);
  }
});

// POST /api/chat/completions - Direct OpenAI Chat Completions passthrough
// Supports all OpenAI parameters including web_search_options for gpt-4o-search-preview
chatRouter.post("/completions", async (c) => {
  const requestId = generateRequestId();

  try {
    // Validate X-APP-KEY header
    const appKey = c.req.header("X-APP-KEY");
    const expectedKey = process.env.APP_CLIENT_KEY;

    if (!appKey || appKey !== expectedKey) {
      return c.json({ error: "Unauthorized", message: "Invalid or missing X-APP-KEY", requestId }, 401);
    }

    // Rate limiting
    const clientIp = c.req.header("x-forwarded-for")?.split(",")[0] || c.req.header("x-real-ip") || "unknown";
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return c.json(
        {
          error: "Rate Limited",
          message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          requestId,
        },
        429
      );
    }

    const body = await c.req.json();
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return c.json({ error: "Configuration Error", message: "Server misconfigured", requestId }, 500);
    }

    const model = (body as Record<string, unknown>).model || "gpt-4o";
    console.log(`[Chat API Completions] Processing request - model: ${model}, requestId: ${requestId}`);

    // Forward directly to OpenAI Chat Completions API (supports web_search_options)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Chat API Completions] OpenAI error - requestId: ${requestId}`, errorText);
      return c.json(
        { error: "AI Service Error", message: "Failed to get response from AI service", requestId },
        502
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    console.log(`[Chat API Completions] Success - requestId: ${requestId}`);

    return c.json({ ...data, requestId });
  } catch (error) {
    console.error(`[Chat API Completions] Unexpected error - requestId: ${requestId}`, error);
    return c.json({ error: "Internal Server Error", message: "An unexpected error occurred", requestId }, 500);
  }
});

export { chatRouter };
