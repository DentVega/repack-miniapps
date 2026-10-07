import { ed25519 } from "@noble/curves/ed25519.js";
import type { ResolveResponse } from "@dentvega/miniapp-contract";
import { b64urlToBytes, utf8Bytes } from "./base64url.js";
import { signatureMessage } from "./signatureMessage.js";
import type { TrustBundleClient } from "./trustBundle.js";

export type SignatureResult = "ok" | "missing" | "invalid" | "unknown-key" | "skip";

export interface SignatureVerifier {
  verify(resolved: ResolveResponse, platform: string): Promise<SignatureResult>;
}

/**
 * Verifica la firma Ed25519 del chunk sobre `id:platform:integrity`, usando la pubkey de la
 * miniapp que sale del trust bundle. `skip` cuando no hay bundle (root key off) → el host trata
 * como pass sin métrica.
 */
export function signatureVerifier(bundle: TrustBundleClient): SignatureVerifier {
  return {
    async verify(resolved, platform) {
      const keys = await bundle.keys();
      if (keys === null) return "skip"; // sin root key / bundle ⇒ verificación off
      const pubkey = keys[resolved.id];
      if (pubkey === undefined) return "unknown-key";
      const sig = resolved.manifest.signature;
      const integrity = resolved.manifest.integrity;
      if (!sig || !integrity) return "missing";
      try {
        const msg = utf8Bytes(signatureMessage(resolved.id, platform, integrity));
        const ok = ed25519.verify(b64urlToBytes(sig), msg, b64urlToBytes(pubkey));
        return ok ? "ok" : "invalid";
      } catch {
        return "invalid";
      }
    },
  };
}
