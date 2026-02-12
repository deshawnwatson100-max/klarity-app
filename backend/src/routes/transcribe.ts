import { Hono } from "hono";

const transcribeRouter = new Hono();

// Rate limiting store (in-memory, per IP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 transcriptions per minute

// Generate a unique request ID for error tracking
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Rate limiting check
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

// POST /api/transcribe - Audio transcription endpoint
transcribeRouter.post("/", async (c) => {
  const requestId = generateRequestId();

  try {
    // 1. Validate X-APP-KEY header
    const appKey = c.req.header("X-APP-KEY");
    const expectedKey = process.env.APP_CLIENT_KEY;

    if (!appKey || appKey !== expectedKey) {
      console.log(`[Transcribe API] Unauthorized request - requestId: ${requestId}`);
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
      console.log(`[Transcribe API] Rate limited - IP: ${clientIp}, requestId: ${requestId}`);
      return c.json(
        {
          error: "Rate Limited",
          message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          requestId,
        },
        429
      );
    }

    // 3. Get form data (audio file)
    const formData = await c.req.formData();
    const file = formData.get("file");
    const model = (formData.get("model") as string) || "gpt-4o-transcribe";

    if (!file || !(file instanceof File)) {
      return c.json(
        { error: "Invalid Request", message: "No audio file provided", requestId },
        400
      );
    }

    // 4. Forward to OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error(`[Transcribe API] Missing OPENAI_API_KEY - requestId: ${requestId}`);
      return c.json(
        { error: "Configuration Error", message: "Server misconfigured", requestId },
        500
      );
    }

    console.log(`[Transcribe API] Processing request - model: ${model}, file size: ${file.size}, requestId: ${requestId}`);

    // Create new FormData for OpenAI
    const openaiFormData = new FormData();
    openaiFormData.append("file", file);
    openaiFormData.append("model", model);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Transcribe API] OpenAI error - requestId: ${requestId}`, errorText);
      return c.json(
        { error: "AI Service Error", message: "Failed to transcribe audio", requestId },
        502
      );
    }

    const data = (await response.json()) as { text?: string };
    console.log(`[Transcribe API] Success - requestId: ${requestId}, text length: ${data.text?.length || 0}`);

    return c.json({
      text: data.text || "",
      requestId,
    });
  } catch (error) {
    console.error(`[Transcribe API] Unexpected error - requestId: ${requestId}`, error);
    return c.json(
      { error: "Internal Server Error", message: "An unexpected error occurred", requestId },
      500
    );
  }
});

export { transcribeRouter };
