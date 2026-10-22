import { ed25519 } from "@noble/curves/ed25519.js";
import {
  controlManifestMessage,
  isSignedControlManifest,
  type ControlManifestBody,
  type SignedControlManifest,
} from "@dentvega/miniapp-contract";
import { b64urlToBytes, utf8Bytes } from "./base64url.js";
import type { ManifestStore } from "./manifestStore.js";
import { ResolveFallbackError } from "./ResolveFallbackError.js";
import type { SignatureMode } from "./signatureGate.js";
import type { TrustBundleClient } from "./trustBundle.js";

export interface ControlManifestClient {
  current(): Promise<ControlManifestBody>;
}

const MANIFEST_KEY = "_manifest";

/**
 * Cliente del manifiesto de control firmado. Trae `GET ${baseUrl}/api/control-manifest` y lo
 * acepta solo si la forma, la firma (clave `_manifest` del trust bundle), la expiración (con
 * tolerancia de reloj) y el anti-replay (`seq` no menor al guardado) pasan. Si el GET falla o se
 * rechaza, usa el guardado, que se revalida cada vez. Un rechazo nunca sobrescribe el guardado.
 */
export function controlManifestClient(opts: {
  baseUrl: string;
  trustBundle: TrustBundleClient;
  store: ManifestStore;
  mode: SignatureMode;
  now?: () => number;
  fetchImpl?: typeof fetch;
  clockSkewMs?: number;
  /** Tope del GET antes de caer al guardado. Default 2000. */
  timeoutMs?: number;
}): ControlManifestClient {
  const now = opts.now ?? (() => Date.now());
  const fetchImpl = opts.fetchImpl ?? fetch;
  const skewMs = opts.clockSkewMs ?? 300_000;
  const timeoutMs = opts.timeoutMs ?? 2000;

  /** Solo la firma, según las reglas de claves del modo. La forma ya se comprobó. */
  async function signatureOk(m: SignedControlManifest): Promise<boolean> {
    const keys = await opts.trustBundle.keys();
    const pub = keys?.[MANIFEST_KEY];
    if (pub === undefined) {
      // Sin clave: warn acepta sin verificar; enforce rechaza.
      if (opts.mode !== "warn") return false;
    } else {
      try {
        const ok = ed25519.verify(
          b64urlToBytes(m.signature),
          utf8Bytes(controlManifestMessage(m.body)),
          b64urlToBytes(pub),
        );
        if (!ok) return false; // firma inválida: siempre se rechaza
      } catch {
        return false;
      }
    }
    return true;
  }

  /** Firma + expiración. */
  async function verify(m: SignedControlManifest): Promise<boolean> {
    if (!(await signatureOk(m))) return false;
    const expires = Date.parse(m.body.expiresAt);
    return Number.isFinite(expires) && expires + skewMs >= now();
  }

  function parseStored(raw: string | null): SignedControlManifest | null {
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isSignedControlManifest(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return {
    async current() {
      const stored = parseStored(await opts.store.load().catch(() => null));
      // Piso anti-replay: solo cuenta el guardado con firma válida (aunque esté expirado).
      const floor = stored !== null && (await signatureOk(stored)) ? stored.body.seq : -Infinity;
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
          const res = await fetchImpl(`${opts.baseUrl.replace(/\/+$/, "")}/api/control-manifest`, {
            signal: controller?.signal,
          });
          return res.ok ? ((await res.json()) as unknown) : null;
        })();
        request.catch(() => undefined); // evita rechazo sin manejar si gana el timeout
        const fetched = await Promise.race([request, timeout]);
        {
          if (
            isSignedControlManifest(fetched) &&
            fetched.body.seq >= floor &&
            (await verify(fetched))
          ) {
            await opts.store.save(JSON.stringify(fetched)).catch(() => undefined);
            return fetched.body;
          }
        }
      } catch {
        // sin red / JSON inválido: cae al guardado
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
      if (stored !== null && (await verify(stored))) return stored.body;
      throw new ResolveFallbackError("resolve-failed", "control manifest unavailable");
    },
  };
}
