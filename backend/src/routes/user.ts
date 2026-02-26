import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, getAuthUser } from "../middleware/auth";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const patchProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().max(2_000_000).optional(), // base64 or URL
  profileColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Must be a valid hex color (e.g. #fff or #ffffff)")
    .optional(),
});

// ---------------------------------------------------------------------------
// Shared response type
// ---------------------------------------------------------------------------

type ProfileResponse = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  profileColor: string | null;
};

function toProfileResponse(user: ProfileResponse): ProfileResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    profileColor: user.profileColor,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const userRouter = new Hono();

// Apply auth middleware to every route in this router
userRouter.use("*", requireAuth);

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile.
 */
userRouter.get("/profile", async (c) => {
  const { id } = getAuthUser(c);

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profileColor: true,
      },
    });

    if (!user) {
      return c.json({ error: "Not Found", message: "User not found" }, 404);
    }

    return c.json({ user: toProfileResponse(user) });
  } catch (error) {
    console.error("[GET /api/user/profile] Error:", error);
    return c.json({ error: "Internal Server Error", message: "Failed to fetch profile" }, 500);
  }
});

/**
 * PATCH /api/user/profile
 * Updates name, image, and/or profileColor for the authenticated user.
 * All body fields are optional — only provided fields are written.
 */
userRouter.patch("/profile", async (c) => {
  const { id } = getAuthUser(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Bad Request", message: "Request body must be valid JSON" }, 400);
  }

  const parseResult = patchProfileSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: "Validation Error",
        message: "Invalid request body",
        details: parseResult.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      400
    );
  }

  const parsed = parseResult.data;

  // Reject empty-body requests early
  if (parsed.name === undefined && parsed.image === undefined && parsed.profileColor === undefined) {
    return c.json(
      { error: "Bad Request", message: "At least one field (name, image, profileColor) must be provided" },
      400
    );
  }

  // Build update payload — only include keys that were explicitly sent
  const data: { name?: string; image?: string; profileColor?: string } = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.image !== undefined) data.image = parsed.image;
  if (parsed.profileColor !== undefined) data.profileColor = parsed.profileColor;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profileColor: true,
      },
    });

    return c.json({ user: toProfileResponse(updatedUser) });
  } catch (error) {
    // Prisma P2025 — record not found
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return c.json({ error: "Not Found", message: "User not found" }, 404);
    }

    console.error("[PATCH /api/user/profile] Error:", error);
    return c.json({ error: "Internal Server Error", message: "Failed to update profile" }, 500);
  }
});

export { userRouter };
