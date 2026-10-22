import { ed25519 } from "@noble/curves/ed25519.js";
import { b64urlToBytes, utf8Bytes } from "./base64url.js";
import type { ManifestStore } from "./manifestStore.js";

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

export interface HttpTrustBundleOptions {
  /**
   * Copia persistente del último bundle de red verificado (mismo contrato que `ManifestStore`:
   * texto crudo, nunca lanza). Sirve para arrancar sin red; se revalida con la root key al leerla.
   */
  store?: ManifestStore;
  /** Tope del GET antes de caer a la copia guardada. Default 2000. */
  timeoutMs?: number;
}

/**
 * Cliente del trust bundle. Trae `GET ${baseUrl}/api/trust-bundle`, verifica la firma root
 * contra la `rootPublicKeyB64url` pineada, y devuelve el mapa `{miniappId → pubkey}` o `null`
 * (sin root key / sin bundle / firma root inválida / error). Cachea en memoria solo el bundle
 * verificado: un fallo no se memoriza y la siguiente llamada reintenta. Si la red falla o vence el
 * timeout, usa la copia guardada (si existe), revalidada con la root key; si no valida, la ignora.
 */
export function httpTrustBundleClient(
  baseUrl: string,
  rootPublicKeyB64url: string,
  fetchImpl: typeof fetch = fetch,
  opts: HttpTrustBundleOptions = {},
): TrustBundleClient {
  const timeoutMs = opts.timeoutMs ?? 2000;
  let cache: Record<string, string> | undefined; // solo el resultado verificado
  let inflight: Promise<Record<string, string> | null> | undefined;
  return {
    async keys() {
      if (cache !== undefined) return cache;
      inflight ??= load().finally(() => {
        inflight = undefined;
      });
      return inflight;
    },
  };

  /** Verifica la firma root y devuelve las claves, o `null`. */
  function verified(signed: unknown): Record<string, string> | null {
    const s = signed as SignedTrustBundle | null;
    if (!s?.bundle || typeof s.signature !== "string") return null;
    try {
      const ok = ed25519.verify(
        b64urlToBytes(s.signature),
        utf8Bytes(canonicalBundleMessage(s.bundle)),
        b64urlToBytes(rootPublicKeyB64url),
      );
      return ok ? { ...s.bundle.keys } : null;
    } catch {
      return null;
    }
  }

  async function fetchSigned(): Promise<unknown> {
    const controller = typeof AbortController === "undefined" ? null : new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          controller?.abort();
          resolve(null);
        }, timeoutMs);
      });
      const request = (async () => {
        const res = await fetchImpl(`${baseUrl}/api/trust-bundle`, { signal: controller?.signal });
        return res.ok ? ((await res.json()) as unknown) : null;
      })();
      request.catch(() => undefined); // evita rechazo sin manejar si gana el timeout
      return await Promise.race([request, timeout]);
    } catch {
      return null;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  async function fromStore(): Promise<Record<string, string> | null> {
    if (!opts.store) return null;
    try {
      const raw = await opts.store.load();
      return raw === null ? null : verified(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async function load(): Promise<Record<string, string> | null> {
    if (!rootPublicKeyB64url) return null; // sin root key pineada ⇒ off
    const signed = await fetchSigned();
    const fresh = verified(signed);
    if (fresh !== null) {
      cache = fresh;
      await opts.store?.save(JSON.stringify(signed)).catch(() => undefined);
      return fresh;
    }
    // Sin red, timeout o bundle inválido: la copia guardada, revalidada. No se cachea (reintenta).
    return fromStore();
  }
}
