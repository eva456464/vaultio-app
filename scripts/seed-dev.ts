/**
 * Creates a local development account. It adds no sites and no history:
 * add a client in the app and the agents do the rest.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const EMAIL = process.env.SEED_EMAIL ?? "demo@vaultio.co";
const PASSWORD = process.env.SEED_PASSWORD ?? "vaultio-demo-2026";
const NAME = process.env.SEED_NAME ?? "Damian Knights";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, EMAIL) });
  if (existing) {
    console.log(`Dev account ${EMAIL} already exists.`);
    await client.end();
    return;
  }

  const userId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(schema.user).values({ id: userId, name: NAME, email: EMAIL, emailVerified: true });
    await tx.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(PASSWORD),
    });
    const [organization] = await tx
      .insert(schema.organizations)
      .values({ name: "Vaultio", creatorId: userId, isAgency: true })
      .returning();
    await tx.insert(schema.organizationMembers).values({ organizationId: organization!.id, userId, role: "admin" });
    await tx.insert(schema.userSettings).values({ userId });
    await tx.insert(schema.whitelabelConfigs).values({
      organizationId: organization!.id,
      domain: "app.vaultio.co",
      brandName: "Vaultio",
      primaryColor: "#E94545",
      secondaryColor: "#000000",
      logoUrl: "/brand/vaultio-dragon-256.png",
      faviconUrl: "/brand/vaultio-dragon-64.png",
      sendingDomain: "vaultio.co",
    });
  });

  console.log(`Created ${EMAIL} / ${PASSWORD} in the "Vaultio" agency workspace.`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
