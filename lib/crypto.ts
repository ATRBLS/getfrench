import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits — GCM standard
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY environment variable is not set");
  if (hex.length !== 64) throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64 string: iv (12 bytes) + tag (16 bytes) + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv | tag | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypts a base64 string produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const data = Buffer.from(ciphertext, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/** Encrypts a key→value map. Returns a map of key→encrypted-value. */
export function encryptEnvVars(vars: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, encrypt(v)])
  );
}

/** Decrypts a map produced by encryptEnvVars(). */
export function decryptEnvVars(encrypted: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(encrypted).map(([k, v]) => [k, decrypt(v)])
  );
}

/** Returns a masked version like sk_live_•••••••• */
export function maskSecret(value: string, visibleChars = 8): string {
  if (value.length <= visibleChars) return "••••••••";
  const prefix = value.slice(0, Math.min(8, value.indexOf("_") + 1 || 4));
  return prefix + "•".repeat(8);
}

/** Derives a deterministic display prefix from a key name */
export function maskEnvVars(vars: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, maskSecret(v)])
  );
}
