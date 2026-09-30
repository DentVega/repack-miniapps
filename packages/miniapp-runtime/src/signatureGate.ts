import type { FallbackReason } from "./loaderState.js";
import type { SignatureResult } from "./signature.js";

export type SignatureMode = "warn" | "enforce";

/** No bloquea (monta) — con `metric` opcional a reportar en warn; o bloquea con una razón. */
export type SignatureGateOutcome =
  | { block: false; metric?: FallbackReason }
  | { block: true; reason: FallbackReason };

/**
 * Decide qué hacer con el resultado del signature verify según el modo.
 * `ok`/`skip` montan sin ruido. En **warn**, un resultado malo monta igual pero deja una
 * métrica. En **enforce**, bloquea con la razón tipada. `missing`/`invalid` → `invalid-signature`;
 * `unknown-key` → `unknown-key`.
 */
export function signatureGate(result: SignatureResult, mode: SignatureMode): SignatureGateOutcome {
  if (result === "ok" || result === "skip") return { block: false };
  const reason: FallbackReason = result === "unknown-key" ? "unknown-key" : "invalid-signature";
  return mode === "enforce" ? { block: true, reason } : { block: false, metric: reason };
}
