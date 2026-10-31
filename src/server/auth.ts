import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  // Agencies sign their clients in on their own domains (white label).
  trustedOrigins: async () => {
    const rows = await db
      .select({ domain: schema.whitelabelConfigs.domain })
      .from(schema.whitelabelConfigs)
      .where(isNotNull(schema.whitelabelConfigs.domain));
    return [
      process.env.BETTER_AUTH_URL,
      ...rows.map((row) => `https://${row.domain}`),
    ];
  },
  databaseHooks: {
    user: {
      create: {
        // Every new account gets its own workspace; invited users are moved
        // into the inviting workspace when they accept the invitation.
        after: async (created) => {
          await db.transaction(async (tx) => {
            const [organization] = await tx
              .insert(schema.organizations)
              .values({ name: created.name || created.email, creatorId: created.id })
              .returning();
            await tx
              .insert(schema.organizationMembers)
              .values({ organizationId: organization!.id, userId: created.id, role: "admin" });
            await tx.insert(schema.userSettings).values({ userId: created.id }).onConflictDoNothing();
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export const isGoogleSignInEnabled = googleConfigured;
