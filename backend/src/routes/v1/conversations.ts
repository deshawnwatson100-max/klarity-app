import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { requireAuth, getAuthUser } from "../../middleware/auth";
import { responseCache, inFlightRequests, generateCacheKey } from "../../lib/cache";

const conversationsRouter = new Hono();

// Apply auth middleware to all routes
conversationsRouter.use("*", requireAuth);

// Request validation schemas
const createConversationSchema = z.object({
  title: z.string().optional(),
});

const createMessageSchema = z.object({
  idempotency_key: z.string().uuid(),
  input: z.object({
    text: z.string().min(1),
    mode: z.enum(["decode", "chat"]),
    tone_preference: z.enum(["calm_direct", "soft", "playful"]).optional().default("calm_direct"),
  }),
});

// Optimized JSON schema - smaller output for faster streaming
const KLARITY_RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "klarity_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        decode_card: {
          type: "object",
          properties: {
            headline: { type: "string" },
            read: { type: "array", items: { type: "string" }, maxItems: 3 },
            likely_meanings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["label", "confidence"],
                additionalProperties: false,
              },
              maxItems: 3,
            },
            red_flags: { type: "array", items: { type: "string" }, maxItems: 3 },
            green_flags: { type: "array", items: { type: "string" }, maxItems: 3 },
            next_best_step: { type: "string" },
          },
          required: ["headline", "read", "likely_meanings", "red_flags", "green_flags", "next_best_step"],
          additionalProperties: false,
        },
        chat_reply: {
          type: "object",
          properties: {
            assistant_message: { type: "string" },
            suggested_texts: { type: "array", items: { type: "string" }, maxItems: 2 },
          },
          required: ["assistant_message", "suggested_texts"],
          additionalProperties: false,
        },
        meta: {
          type: "object",
          properties: {
            intent: { type: "string", enum: ["decode", "chat"] },
            tone: { type: "string" },
            safety: {
              type: "object",
              properties: { flagged: { type: "boolean" } },
              required: ["flagged"],
              additionalProperties: false,
            },
          },
          required: ["intent", "tone", "safety"],
          additionalProperties: false,
        },
      },
      required: ["decode_card", "chat_reply", "meta"],
      additionalProperties: false,
    },
  },
};

// Concise system prompt - fewer tokens = faster TTFT
function buildSystemPrompt(mode: string, tonePreference: string, rollingSummary: string | null, memories: string[]): string {
  const tone = {
    calm_direct: "Calm, clear, direct.",
    soft: "Gentle, supportive.",
    playful: "Light, fun.",
  }[tonePreference] || "Calm, clear.";

  let prompt = `You are Klarity. Help users decode messages.

TONE: ${tone}
MODE: ${mode === "decode" ? "DECODE - Analyze text, find patterns, suggest responses." : "CHAT - Answer questions helpfully."}

ASSISTANT MESSAGE RULES (for chat_reply.assistant_message):
- Provide psychological clarity and emotional resolution, NOT engagement
- Calmly interpret what likely happened in plain human language
- Reduce overthinking by stating what the message probably does NOT mean
- Optionally offer a gentle suggested approach (not directive)
- End the message cleanly. NO questions. NO prompts. NO calls to respond
- Avoid coaching phrases like "how do you feel", "what do you want", "let's explore"
- Never use bullet lists. Write 3-6 flowing sentences max
- Sound like a perceptive friend explaining the situation, not a therapist

Output JSON only. Be concise.`;

  if (rollingSummary) {
    // Truncate summary to ~500 chars max
    const truncated = rollingSummary.length > 500 ? rollingSummary.slice(-500) : rollingSummary;
    prompt += `\n\nCONTEXT: ${truncated}`;
  }

  if (memories.length > 0) {
    prompt += `\n\nUSER: ${memories.slice(0, 5).map(m => m.substring(0, 50)).join("; ")}`;
  }

  return prompt;
}

// Generate request ID
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Timing helper
interface Timing {
  t_request_start: number;
  t_first_token?: number;
  t_done?: number;
  total_tokens_out?: number;
}

// POST /v1/conversations - Create a new conversation
conversationsRouter.post("/", async (c) => {
  const requestId = generateRequestId();

  try {
    const user = getAuthUser(c);
    const body = await c.req.json().catch(() => ({}));
    const parseResult = createConversationSchema.safeParse(body);

    const title = parseResult.success ? parseResult.data.title : undefined;

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title,
      },
    });

    return c.json({ conversationId: conversation.id, requestId });
  } catch (error) {
    console.error(`[Conversations API] Error - ${requestId}`, error);
    return c.json({ error: "Internal Server Error", requestId }, 500);
  }
});

// GET /v1/conversations/:id - Get conversation with last 50 messages
conversationsRouter.get("/:id", async (c) => {
  const requestId = generateRequestId();

  try {
    const user = getAuthUser(c);
    const conversationId = c.req.param("id");

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { decode: true },
        },
      },
    });

    if (!conversation) {
      return c.json({ error: "Not Found", requestId }, 404);
    }

    conversation.messages.reverse();

    return c.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        rollingSummary: conversation.rollingSummary,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
      },
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        createdAt: m.createdAt,
        decode: m.decode ? JSON.parse(m.decode.json) : null,
      })),
      requestId,
    });
  } catch (error) {
    console.error(`[Conversations API] Error - ${requestId}`, error);
    return c.json({ error: "Internal Server Error", requestId }, 500);
  }
});

// POST /v1/conversations/:id/messages - Main endpoint with optimized streaming
conversationsRouter.post("/:id/messages", async (c) => {
  const requestId = generateRequestId();
  const timing: Timing = { t_request_start: Date.now() };

  try {
    const user = getAuthUser(c);
    const conversationId = c.req.param("id");

    // Parse request
    const body = await c.req.json();
    const parseResult = createMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({
        error: "Invalid Request",
        details: parseResult.error.issues.map((i) => i.message),
        requestId,
      }, 400);
    }

    const { idempotency_key, input } = parseResult.data;

    // OPTIMIZATION 1: Check in-memory cache first (fastest path)
    const cacheKey = generateCacheKey(user.id, input.text, input.mode);
    const cached = responseCache.get(cacheKey);
    if (cached && cached.parsedJson) {
      console.log(`[Conversations API] Cache hit - ${requestId} (${Date.now() - timing.t_request_start}ms)`);
      const cachedData = cached.parsedJson as Record<string, unknown>;
      return c.json({
        ...cachedData,
        cached: true,
        timing: { cache_hit: true, latency_ms: Date.now() - timing.t_request_start },
        requestId,
      });
    }

    // OPTIMIZATION 2: Check for in-flight duplicate request
    if (inFlightRequests.has(cacheKey)) {
      console.log(`[Conversations API] Waiting for in-flight request - ${requestId}`);
      try {
        const result = await inFlightRequests.get(cacheKey);
        return c.json({ ...result as object, deduplicated: true, requestId });
      } catch {
        // In-flight request failed, continue with new request
      }
    }

    // Verify ownership (parallel with DB operations)
    const [conversation, existingMessage] = await Promise.all([
      prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
      }),
      // OPTIMIZATION 3: Check DB idempotency
      prisma.message.findFirst({
        where: { conversationId, idempotencyKey: idempotency_key, role: "assistant" },
        include: { decode: true },
      }),
    ]);

    if (!conversation) {
      return c.json({ error: "Not Found", requestId }, 404);
    }

    // Return existing result if idempotency key exists
    if (existingMessage) {
      console.log(`[Conversations API] Idempotency DB hit - ${requestId}`);
      const result = {
        message: {
          id: existingMessage.id,
          role: existingMessage.role,
          text: existingMessage.text,
          createdAt: existingMessage.createdAt,
        },
        decode: existingMessage.decode ? JSON.parse(existingMessage.decode.json) : null,
        cached: true,
      };
      return c.json({ ...result, requestId });
    }

    // Insert user message (don't wait)
    const userMessagePromise = prisma.message.create({
      data: {
        conversationId,
        role: "user",
        text: input.text,
        idempotencyKey: idempotency_key,
      },
    });

    // OPTIMIZATION 4: Fetch only last 10 messages + use rolling summary
    const [recentMessages, memories] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 10, // Reduced from 20
        select: { role: true, text: true }, // Select only needed fields
      }),
      prisma.memory.findMany({
        where: { userId: user.id },
        orderBy: [{ strength: "desc" }, { lastUsedAt: "desc" }],
        take: 5, // Reduced from 10
        select: { text: true },
      }),
    ]);
    recentMessages.reverse();

    // OPTIMIZATION 5: Concise system prompt
    const systemPrompt = buildSystemPrompt(
      input.mode,
      input.tone_preference ?? "calm_direct",
      conversation.rollingSummary,
      memories.map((m) => m.text)
    );

    // Build minimal messages array (trim long messages)
    const openaiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...recentMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text.length > 500 ? m.text.substring(0, 500) + "..." : m.text,
      })),
    ];

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return c.json({ error: "Configuration Error", requestId }, 500);
    }

    console.log(`[Conversations API] Starting OpenAI call - ${requestId} (${Date.now() - timing.t_request_start}ms)`);

    // OPTIMIZATION 6: Use gpt-4o-mini for faster responses (can change to gpt-4o if quality is priority)
    const MODEL = "gpt-4o-mini"; // Faster than gpt-4o
    const MAX_TOKENS = 1500; // Reduced from 4096

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
        stream: true,
        response_format: KLARITY_RESPONSE_SCHEMA,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] OpenAI error - ${requestId}`, errorText);
      return c.json({ error: "AI Service Error", requestId }, 502);
    }

    // Ensure user message is saved
    await userMessagePromise;

    // Stream response with status events
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let fullContent = "";
        let tokenCount = 0;
        let firstTokenSent = false;

        // Send initial status event immediately
        controller.enqueue(`event: status\ndata: ${JSON.stringify({ state: "thinking" })}\n\n`);

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
                  timing.t_done = Date.now();
                  timing.total_tokens_out = tokenCount;

                  // Process and persist
                  try {
                    const parsedResponse = JSON.parse(fullContent);
                    const latencyMs = timing.t_done - timing.t_request_start;

                    // Log timing
                    console.log(`[Conversations API] Complete - ${requestId}`, {
                      latency_ms: latencyMs,
                      ttft_ms: timing.t_first_token ? timing.t_first_token - timing.t_request_start : null,
                      tokens_out: tokenCount,
                      model: MODEL,
                    });

                    // Persist assistant message (async, don't block stream)
                    const assistantMessage = await prisma.message.create({
                      data: {
                        conversationId,
                        role: "assistant",
                        text: parsedResponse.chat_reply?.assistant_message || fullContent,
                        idempotencyKey: `${idempotency_key}_response`,
                        modelUsed: MODEL,
                        tokensOut: tokenCount,
                        latencyMs,
                      },
                    });

                    // Persist decode (async)
                    if (parsedResponse.decode_card) {
                      await prisma.decode.create({
                        data: {
                          messageId: assistantMessage.id,
                          json: JSON.stringify(parsedResponse.decode_card),
                        },
                      });
                    }

                    // Update rolling summary (deterministic, no API call)
                    const summaryUpdate = `[${input.mode}] ${input.text.substring(0, 80)}`;
                    const newSummary = conversation.rollingSummary
                      ? `${conversation.rollingSummary.slice(-1500)}\n${summaryUpdate}`
                      : summaryUpdate;

                    await prisma.conversation.update({
                      where: { id: conversationId },
                      data: { rollingSummary: newSummary, lastMessageAt: new Date() },
                    });

                    // Cache the result
                    responseCache.set(cacheKey, {
                      response: fullContent,
                      parsedJson: {
                        message: {
                          id: assistantMessage.id,
                          role: "assistant",
                          text: parsedResponse.chat_reply?.assistant_message,
                          createdAt: assistantMessage.createdAt,
                        },
                        decode: parsedResponse.decode_card || null,
                        meta: parsedResponse.meta || null,
                      },
                      timestamp: Date.now(),
                    });

                    // Send done event
                    controller.enqueue(
                      `event: done\ndata: ${JSON.stringify({
                        json: parsedResponse,
                        message: {
                          id: assistantMessage.id,
                          role: "assistant",
                          text: parsedResponse.chat_reply?.assistant_message,
                        },
                        timing: {
                          latency_ms: latencyMs,
                          ttft_ms: timing.t_first_token ? timing.t_first_token - timing.t_request_start : null,
                          tokens_out: tokenCount,
                        },
                        requestId,
                      })}\n\n`
                    );
                  } catch (parseError) {
                    console.error(`[Conversations API] Parse error - ${requestId}`, parseError);
                    controller.enqueue(
                      `event: error\ndata: ${JSON.stringify({ error: "Failed to parse response", requestId })}\n\n`
                    );
                  }
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    if (!firstTokenSent) {
                      timing.t_first_token = Date.now();
                      firstTokenSent = true;
                      console.log(`[Conversations API] First token - ${requestId} (${timing.t_first_token - timing.t_request_start}ms)`);
                    }
                    fullContent += content;
                    tokenCount++;
                    // Send token event
                    controller.enqueue(`event: token\ndata: ${JSON.stringify({ t: content })}\n\n`);
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
        "Connection": "keep-alive",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    console.error(`[Conversations API] Error - ${requestId}`, error);
    return c.json({ error: "Internal Server Error", requestId }, 500);
  }
});

export { conversationsRouter };
