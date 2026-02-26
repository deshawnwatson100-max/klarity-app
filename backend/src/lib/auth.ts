import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = process.env.APPLE_CLIENT_SECRET;
const appleAppBundleIdentifier = process.env.APPLE_APP_BUNDLE_IDENTIFIER;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  trustedOrigins: [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:3000",
    "https://preview-ufqgorsmzkin.dev.vibecode.run",
    "https://myicezgkxjoy.dev.vibecode.run",
    "vibecode://*",
    "exp://*",
    "https://*.dev.vibecode.run",
    "https://*.vibecode.run",
    "https://*.vibecodeapp.com",
  ],
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
          ...(appleClientId && appleClientSecret && appleAppBundleIdentifier
            ? {
                apple: {
                  clientId: appleClientId,
                  clientSecret: appleClientSecret,
                  appBundleIdentifier: appleAppBundleIdentifier,
                },
              }
            : {}),
        },
      }
    : {}),
  advanced: {
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
});

// Export type for session
export type Session = typeof auth.$Infer.Session;
