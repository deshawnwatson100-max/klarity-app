import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../lib/db";
import { requireAuth, getAuthUser } from "../../middleware/auth";

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

// Response JSON schema for OpenAI
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
            read: { type: "array", items: { type: "string" } },
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
            },
            red_flags: { type: "array", items: { type: "string" } },
            green_flags: { type: "array", items: { type: "string" } },
            next_best_step: { type: "string" },
          },
          required: ["headline", "read", "likely_meanings", "red_flags", "green_flags", "next_best_step"],
          additionalProperties: false,
        },
        chat_reply: {
          type: "object",
          properties: {
            assistant_message: { type: "string" },
            suggested_texts: { type: "array", items: { type: "string" } },
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
              properties: {
                flagged: { type: "boolean" },
              },
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

// System prompt for Klarity
function buildSystemPrompt(mode: string, tonePreference: string, rollingSummary: string | null, memories: string[]): string {
  const toneInstructions = {
    calm_direct: "Be calm, clear, and direct. No fluff.",
    soft: "Be gentle and supportive while still being helpful.",
    playful: "Be lighthearted and fun while still being insightful.",
  }[tonePreference] || "Be calm, clear, and direct.";

  let prompt = `You are Klarity, an AI assistant that helps users understand text messages and communication.

TONE: ${toneInstructions}

MODE: ${mode === "decode" ? "DECODE - Analyze the user's message/screenshot and provide insights about what it means, potential red/green flags, and suggested next steps." : "CHAT - Have a helpful conversation with the user about their communication needs."}

You MUST respond with valid JSON matching the specified schema. Always provide both decode_card and chat_reply fields, even if one is less relevant to the current mode.`;

  if (rollingSummary) {
    prompt += `\n\nCONVERSATION CONTEXT:\n${rollingSummary}`;
  }

  if (memories.length > 0) {
    prompt += `\n\nUSER MEMORIES (preferences and facts you know about this user):\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
  }

  return prompt;
}

// Generate request ID
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
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

    console.log(`[Conversations API] Created conversation ${conversation.id} for user ${user.id}`);

    return c.json({
      conversationId: conversation.id,
      requestId,
    });
  } catch (error) {
    console.error(`[Conversations API] Error creating conversation - requestId: ${requestId}`, error);
    return c.json(
      { error: "Internal Server Error", message: "Failed to create conversation", requestId },
      500
    );
  }
});

// GET /v1/conversations/:id - Get conversation with last 50 messages
conversationsRouter.get("/:id", async (c) => {
  const requestId = generateRequestId();

  try {
    const user = getAuthUser(c);
    const conversationId = c.req.param("id");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id, // Verify ownership
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            decode: true,
          },
        },
      },
    });

    if (!conversation) {
      return c.json(
        { error: "Not Found", message: "Conversation not found or access denied", requestId },
        404
      );
    }

    // Reverse messages to chronological order
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
    console.error(`[Conversations API] Error fetching conversation - requestId: ${requestId}`, error);
    return c.json(
      { error: "Internal Server Error", message: "Failed to fetch conversation", requestId },
      500
    );
  }
});

// POST /v1/conversations/:id/messages - Main endpoint with streaming
conversationsRouter.post("/:id/messages", async (c) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const user = getAuthUser(c);
    const conversationId = c.req.param("id");

    // Parse and validate request body
    const body = await c.req.json();
    const parseResult = createMessageSchema.safeParse(body);

    if (!parseResult.success) {
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

    const { idempotency_key, input } = parseResult.data;

    // Verify user owns conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
    });

    if (!conversation) {
      return c.json(
        { error: "Not Found", message: "Conversation not found or access denied", requestId },
        404
      );
    }

    // Check idempotency - return existing result if key exists
    const existingMessage = await prisma.message.findFirst({
      where: {
        conversationId,
        idempotencyKey: idempotency_key,
        role: "assistant",
      },
      include: {
        decode: true,
      },
    });

    if (existingMessage) {
      console.log(`[Conversations API] Idempotency hit for key ${idempotency_key}`);
      return c.json({
        message: {
          id: existingMessage.id,
          role: existingMessage.role,
          text: existingMessage.text,
          createdAt: existingMessage.createdAt,
        },
        decode: existingMessage.decode ? JSON.parse(existingMessage.decode.json) : null,
        cached: true,
        requestId,
      });
    }

    // Insert user message immediately
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        text: input.text,
        idempotencyKey: idempotency_key,
      },
    });

    // Build context: fetch last N messages
    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    recentMessages.reverse();

    // Fetch user memories (MVP: top 10 by strength/recency)
    const memories = await prisma.memory.findMany({
      where: { userId: user.id },
      orderBy: [{ strength: "desc" }, { lastUsedAt: "desc" }],
      take: 10,
    });

    // Build messages array for OpenAI
    const systemPrompt = buildSystemPrompt(
      input.mode,
      input.tone_preference ?? "calm_direct",
      conversation.rollingSummary,
      memories.map((m) => m.text)
    );

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })),
    ];

    // Call OpenAI with streaming
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return c.json(
        { error: "Configuration Error", message: "Server misconfigured", requestId },
        500
      );
    }

    console.log(`[Conversations API] Calling OpenAI - mode: ${input.mode}, conversationId: ${conversationId}`);

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
        model: "gpt-4o",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
        response_format: KLARITY_RESPONSE_SCHEMA,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Conversations API] OpenAI error - requestId: ${requestId}`, errorText);
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
                  // Process completed response
                  try {
                    const latencyMs = Date.now() - startTime;
                    const parsedResponse = JSON.parse(fullContent);

                    // Insert assistant message
                    const assistantMessage = await prisma.message.create({
                      data: {
                        conversationId,
                        role: "assistant",
                        text: parsedResponse.chat_reply?.assistant_message || fullContent,
                        idempotencyKey: `${idempotency_key}_response`,
                        modelUsed: "gpt-4o",
                        latencyMs,
                      },
                    });

                    // Insert decode if present
                    if (parsedResponse.decode_card) {
                      await prisma.decode.create({
                        data: {
                          messageId: assistantMessage.id,
                          json: JSON.stringify(parsedResponse.decode_card),
                        },
                      });
                    }

                    // Update conversation lastMessageAt
                    await prisma.conversation.update({
                      where: { id: conversationId },
                      data: { lastMessageAt: new Date() },
                    });

                    // Update rolling summary (MVP: simple append)
                    const summaryUpdate = `User: ${input.text.substring(0, 100)}... | Assistant: ${(parsedResponse.chat_reply?.assistant_message || "").substring(0, 100)}...`;
                    const newSummary = conversation.rollingSummary
                      ? `${conversation.rollingSummary}\n${summaryUpdate}`
                      : summaryUpdate;

                    // Keep summary under 2000 chars
                    const trimmedSummary = newSummary.length > 2000
                      ? newSummary.slice(-2000)
                      : newSummary;

                    await prisma.conversation.update({
                      where: { id: conversationId },
                      data: { rollingSummary: trimmedSummary },
                    });

                    // Extract and store tone preference as memory if explicitly mentioned
                    if (input.tone_preference) {
                      const existingToneMemory = await prisma.memory.findFirst({
                        where: {
                          userId: user.id,
                          type: "preference",
                          text: { contains: "tone" },
                        },
                      });

                      if (!existingToneMemory) {
                        await prisma.memory.create({
                          data: {
                            userId: user.id,
                            text: `Prefers ${input.tone_preference} tone in responses`,
                            type: "preference",
                            strength: 0.8,
                          },
                        });
                      }
                    }

                    // Send done event with full payload
                    controller.enqueue(
                      `event: done\ndata: ${JSON.stringify({
                        message: {
                          id: assistantMessage.id,
                          role: "assistant",
                          text: parsedResponse.chat_reply?.assistant_message || fullContent,
                          createdAt: assistantMessage.createdAt,
                        },
                        decode: parsedResponse.decode_card || null,
                        meta: parsedResponse.meta || null,
                        requestId,
                      })}\n\n`
                    );
                  } catch (parseError) {
                    console.error(`[Conversations API] Error parsing response - requestId: ${requestId}`, parseError);
                    controller.enqueue(
                      `event: error\ndata: ${JSON.stringify({ error: "Failed to parse AI response", requestId })}\n\n`
                    );
                  }
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    fullContent += content;
                    // Send token event
                    controller.enqueue(`event: token\ndata: ${JSON.stringify({ chunk: content })}\n\n`);
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
  } catch (error) {
    console.error(`[Conversations API] Unexpected error - requestId: ${requestId}`, error);
    return c.json(
      { error: "Internal Server Error", message: "An unexpected error occurred", requestId },
      500
    );
  }
});

export { conversationsRouter };
