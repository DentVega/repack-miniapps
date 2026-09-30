import {
  gteVersion,
  isManifest,
  satisfiesShared,
  type Manifest,
  type SemVer,
} from "@dentvega/miniapp-contract";
import type { FallbackReason } from "./loaderState.js";

/** Versions the host provides as singletons (name → concrete version). */
export type HostProvided = Readonly<Record<string, SemVer>>;

export type EvaluateResult =
  | { ok: true; manifest: Manifest }
  | { ok: false; reason: FallbackReason; detail: string };

/**
 * Validate an untrusted manifest before mounting: structural shape, then
 * singleton version-skew against what the host provides, then — if the manifest
 * declares `minHostContract` and the host exposes its own `hostContractVersion` —
 * the "host-too-old" guard: an old host binary in the field refuses to mount a
 * miniapp that requires a newer contract (instead of crashing). Pure — reused in tests.
 */
export function evaluateManifest(
  manifest: unknown,
  hostProvided: HostProvided,
  hostContractVersion?: string,
): EvaluateResult {
  if (!isManifest(manifest)) {
    return { ok: false, reason: "invalid-manifest", detail: "bad manifest shape" };
  }
  const skew = satisfiesShared(hostProvided, manifest.shared);
  if (!skew.compatible) {
    const bad = skew.entries
      .filter((e) => e.status !== "ok")
      .map((e) => `${e.name}(${e.status})`)
      .join(", ");
    return { ok: false, reason: "skew", detail: `incompatible: ${bad}` };
  }
  const min = manifest.minHostContract;
  if (min !== undefined && hostContractVersion !== undefined) {
    const cvOk = gteVersion(hostContractVersion, min.contractVersion);
    const rnOk = gteVersion(hostProvided["react-native"] ?? "", min.reactNative);
    if (!cvOk || !rnOk) {
      const why = [
        cvOk ? null : `contract ${hostContractVersion} < ${min.contractVersion}`,
        rnOk ? null : `react-native ${hostProvided["react-native"]} < ${min.reactNative}`,
      ]
        .filter(Boolean)
        .join("; ");
      return { ok: false, reason: "host-too-old", detail: `host too old: ${why}` };
    }
  }
  return { ok: true, manifest };
}
