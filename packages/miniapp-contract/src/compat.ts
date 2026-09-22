/**
 * Compatibility checks that compose shared-version skew with native-module presence.
 * Pure — no fs/network. Consumed by the host generator, the template CI gate, and
 * Backstage's upload gate.
 */
import type { HostContract, SharedDepSpec, SemVer } from "./types.js";
import { satisfiesShared, type SkewResult } from "./shared.js";

export interface NativeCheckResult {
  readonly compatible: boolean;
  /** Native modules the miniapp needs that the host binary does NOT provide. */
  readonly missing: readonly string[];
}

/**
 * A native module can only run if it is compiled into the host binary. This flags
 * every native module the miniapp autolinks that the host's capability set lacks.
 */
export function checkNativeModules(
  hostNativeModules: readonly string[],
  miniappNativeModules: readonly string[],
): NativeCheckResult {
  const host = new Set(hostNativeModules);
  const missing = miniappNativeModules.filter((m) => !host.has(m));
  return { compatible: missing.length === 0, missing };
}

export interface CompatReport {
  readonly compatible: boolean;
  readonly skew: SkewResult;
  readonly native: NativeCheckResult;
}

/**
 * Full compatibility of a miniapp against a host contract: shared-version skew
 * (semver) AND native-module presence. Compatible only when both hold.
 */
export function checkCompatibility(
  contract: HostContract,
  miniappShared: readonly SharedDepSpec[],
  miniappNativeModules: readonly string[],
): CompatReport {
  // `contract.shared` is Record<string,string>; satisfiesShared wants the branded
  // SemVer form — the brand is compile-time only, so this cast has no runtime effect.
  const skew = satisfiesShared(
    contract.shared as Readonly<Record<string, SemVer>>,
    miniappShared,
  );
  const native = checkNativeModules(contract.nativeModules, miniappNativeModules);
  return { compatible: skew.compatible && native.compatible, skew, native };
}
