import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

// Type for authenticated context
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

// Middleware to require authentication
export async function requireAuth(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    // Attach user and session to context
    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired session" },
      401
    );
  }
}

// Helper to get authenticated user from context
export function getAuthUser(c: Context): AuthContext["user"] {
  return c.get("user");
}

// Helper to get session from context
export function getAuthSession(c: Context): AuthContext["session"] {
  return c.get("session");
}
