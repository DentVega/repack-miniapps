export type {
  FallbackReason,
  LoaderState,
  LoaderEvent,
} from "./loaderState.js";
export { initialLoaderState, nextLoaderState, isRetryable } from "./loaderState.js";

export type { HostProvided, EvaluateResult } from "./evaluate.js";
export { evaluateManifest } from "./evaluate.js";

export type { IntegrityVerifier } from "./integrity.js";
export { noopVerifier, sha256Verifier } from "./integrity.js";
export { sha256Hex } from "./sha256.js";

export type { SignatureVerifier, SignatureResult } from "./signature.js";
export { signatureVerifier } from "./signature.js";
export type { SignatureMode, SignatureGateOutcome } from "./signatureGate.js";
export { signatureGate } from "./signatureGate.js";
export type { TrustBundleClient, SignedTrustBundle, TrustBundleBody } from "./trustBundle.js";
export { httpTrustBundleClient, canonicalBundleMessage } from "./trustBundle.js";
export { signatureMessage } from "./signatureMessage.js";
export { b64urlToBytes } from "./base64url.js";

export type { ResolveClient } from "./ResolveClient.js";
export { httpResolveClient } from "./ResolveClient.js";
export { cachingResolveClient } from "./cachingResolveClient.js";
export type { MetricsClient, MetricEvent } from "./MetricsClient.js";
export { httpMetricsClient, noopMetricsClient } from "./MetricsClient.js";

export { parseDevRemotes, devResolveClient, isDevRemote } from "./devResolveClient.js";

export type { CatalogClient, MiniappSummary } from "./CatalogClient.js";
export { httpCatalogClient } from "./CatalogClient.js";

export type { ChunkLoader, EntryComponent } from "./ChunkLoader.js";

export type { UseMiniappDeps, UseMiniappResult } from "./useMiniapp.js";
export { useMiniapp } from "./useMiniapp.js";

// --- Capability grant helper (host owns the scoped, revocable grant) ---
import type { Capability, CapabilityGrant } from "@dentvega/miniapp-contract";

export interface ScopedGrant {
  readonly grant: CapabilityGrant;
  readonly revoke: () => void;
}

export function createScopedGrant(granted: readonly Capability[]): ScopedGrant {
  let revoked = false;
  return {
    grant: { granted, isRevoked: () => revoked },
    revoke: () => {
      revoked = true;
    },
  };
}
