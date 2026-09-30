import type { ResolveResponse } from "@dentvega/miniapp-contract";
import { sha256Hex } from "./sha256.js";

/**
 * Chunk integrity verification (ADR-008). `sha256Verifier` is the real check;
 * `noopVerifier` remains for tests/opt-out. Swap the impl, not the call site.
 */
export interface IntegrityVerifier {
  verify(resolved: ResolveResponse): Promise<boolean>;
}

export const noopVerifier: IntegrityVerifier = {
  // Always passes. ⚠️ No cryptographic guarantee — for tests / explicit opt-out.
  async verify(): Promise<boolean> {
    return true;
  },
};

/**
 * Real integrity check: download the resolved chunk, hash it, and compare against
 * the manifest's `integrity` descriptor (`sha256-<hex>`, set by Backstage at
 * publish from the actual bytes). A mismatch (tampered/corrupt chunk) → false →
 * the loader shows the fallback instead of executing untrusted code.
 *
 * If the manifest declares no integrity, nothing is verified (legacy/unsigned
 * versions still mount — documented, activation-pending compat). `fetchImpl` is
 * injectable for tests.
 */
export function sha256Verifier(
  fetchImpl: typeof fetch = fetch,
): IntegrityVerifier {
  return {
    async verify(resolved: ResolveResponse): Promise<boolean> {
      const declared = resolved.manifest.integrity;
      if (declared === undefined || declared === "") return true;
      try {
        const res = await fetchImpl(resolved.url);
        if (!res.ok) return false;
        const bytes = new Uint8Array(await res.arrayBuffer());
        return `sha256-${sha256Hex(bytes)}` === declared;
      } catch {
        return false;
      }
    },
  };
}
