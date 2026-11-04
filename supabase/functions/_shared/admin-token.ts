// Short-lived signed token proving a caller passed the admin password check.
//
// The admin app's only proof of identity was a localStorage JSON blob, which a
// browser can write freely — fine for toggling UI, useless for authorising a
// privileged call. Any edge function that performs an admin-only action needs
// something it can verify itself, which is what this is.
//
// Deliberately not a JWT: no library, one algorithm, no `alg` field for a
// caller to negotiate down to "none".
//
// Requires ADMIN_TOKEN_SECRET in the function environment:
//   supabase secrets set ADMIN_TOKEN_SECRET="$(openssl rand -hex 32)"

const SECRET = Deno.env.get("ADMIN_TOKEN_SECRET") ?? "";
const TTL_MS = 12 * 60 * 60 * 1000; // matches the admin session's own lifetime

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return b64url(new Uint8Array(sig));
}

/** Issue a token for a verified admin. Format: <userId>.<expiryMs>.<hmac> */
export async function issueAdminToken(userId: string): Promise<string | null> {
  if (!SECRET) {
    console.error("admin-token: ADMIN_TOKEN_SECRET is not set");
    return null;
  }
  const payload = `${userId}.${Date.now() + TTL_MS}`;
  return `${payload}.${await sign(payload)}`;
}

/** Verify a token. Returns the admin user id, or null if it is not valid. */
export async function verifyAdminToken(token: unknown): Promise<string | null> {
  if (!SECRET || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiry, provided] = parts;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const expected = await sign(`${userId}.${expiry}`);
  // Constant-time compare: a byte-by-byte early exit leaks the signature.
  if (expected.length !== provided.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0 ? userId : null;
}
