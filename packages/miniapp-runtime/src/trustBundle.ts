import { ed25519 } from "@noble/curves/ed25519.js";
import { b64urlToBytes, utf8Bytes } from "./base64url.js";

export interface TrustBundleBody {
  readonly version: number;
  readonly updatedAt: string;
  readonly keys: Readonly<Record<string, string>>;
}
export interface SignedTrustBundle {
  readonly bundle: TrustBundleBody;
  readonly signature: string;
}

/** Igual que el backend: keys ordenadas alfabéticamente, JSON determinístico. */
export function canonicalBundleMessage(body: TrustBundleBody): string {
  const keys: Record<string, string> = {};
  for (const k of Object.keys(body.keys).sort()) keys[k] = body.keys[k]!;
  return JSON.stringify({ version: body.version, updatedAt: body.updatedAt, keys });
}

export interface TrustBundleClient {
  keys(): Promise<Record<string, string> | null>;
}

/**
 * Cliente del trust bundle. Trae `GET ${baseUrl}/api/trust-bundle`, verifica la firma root
 * contra la `rootPublicKeyB64url` pineada, y devuelve el mapa `{miniappId → pubkey}` o `null`
 * (sin root key / sin bundle / firma root inválida / error). Cachea en memoria (session).
 */
export function httpTrustBundleClient(
  baseUrl: string,
  rootPublicKeyB64url: string,
  fetchImpl: typeof fetch = fetch,
): TrustBundleClient {
  let cache: Record<string, string> | null | undefined; // undefined = no consultado aún
  return {
    async keys() {
      if (cache !== undefined) return cache;
      cache = await load();
      return cache;
    },
  };

  async function load(): Promise<Record<string, string> | null> {
    if (!rootPublicKeyB64url) return null; // sin root key pineada ⇒ off
    try {
      const res = await fetchImpl(`${baseUrl}/api/trust-bundle`);
      if (!res.ok) return null;
      const signed = (await res.json()) as SignedTrustBundle;
      if (!signed?.bundle || typeof signed.signature !== "string") return null;
      const msg = utf8Bytes(canonicalBundleMessage(signed.bundle));
      const ok = ed25519.verify(
        b64urlToBytes(signed.signature),
        msg,
        b64urlToBytes(rootPublicKeyB64url),
      );
      if (!ok) return null;
      return { ...signed.bundle.keys };
    } catch {
      return null;
    }
  }
}
