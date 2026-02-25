import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // MVP: skip email verification
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },
  trustedOrigins: [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:3000",
    "https://preview-ufqgorsmzkin.dev.vibecode.run",
    "https://myicezgkxjoy.dev.vibecode.run",
  ],
});

// Export type for session
export type Session = typeof auth.$Infer.Session;
