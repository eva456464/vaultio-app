import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for integration credentials at rest. Uses APP_ENCRYPTION_KEY
 * (64 hex chars) when set, otherwise a key derived from BETTER_AUTH_SECRET.
 */
function key() {
  const configured = process.env.APP_ENCRYPTION_KEY;
  if (configured && /^[0-9a-f]{64}$/i.test(configured)) return Buffer.from(configured, "hex");
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Set APP_ENCRYPTION_KEY or BETTER_AUTH_SECRET");
  return createHash("sha256").update(`vaultio-credentials:${secret}`).digest();
}

export function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(".");
}

export function decryptJson<T>(payload: string): T {
  const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv!);
  decipher.setAuthTag(tag!);
  return JSON.parse(Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8")) as T;
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function newApiKey() {
  const raw = `vlt_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: sha256(raw), prefix: raw.slice(0, 8) };
}
