/** Access tokens issued by GeoBov last 24 hours. The server remains the authority. */
export const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const EXPIRY_SKEW_MS = 30_000;

export function readTokenExpiryMs(token: string): number | null {
  const segment = token.split(".")[1];
  if (!segment) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(segment)) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function resolveTokenExpiryMs(token: string, now = Date.now()): number {
  return readTokenExpiryMs(token) ?? now + ACCESS_TOKEN_TTL_MS;
}

export function isTokenExpired(expiresAtMs: number | null, now = Date.now()): boolean {
  if (expiresAtMs == null) return false;
  return now >= expiresAtMs - EXPIRY_SKEW_MS;
}

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);

  try {
    return decodeURIComponent(
      binary
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch {
    return binary;
  }
}
