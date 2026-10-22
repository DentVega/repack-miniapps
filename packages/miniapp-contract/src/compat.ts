/**
 * Compatibility checks that compose shared-version skew with native-module presence.
 * Pure — no fs/network. Consumed by the host generator, the template CI gate, and
 * Backstage's upload gate.
 */
import type { HostContract, Manifest, SharedDepSpec, SemVer } from "./types.js";
import { gteVersion, satisfiesShared, type SkewResult } from "./shared.js";

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

/**
 * Compatibilidad de un manifest contra un host, con los motivos en texto:
 * shared (semver) + módulos nativos + `minHostContract` (contractVersion y
 * reactNative con `gteVersion`). Lo usa el servidor al derivar los bloques por host.
 */
export function hostCompatReport(
  contract: HostContract,
  manifest: Manifest & { readonly nativeModules?: readonly string[] },
): { readonly compatible: boolean; readonly reasons: readonly string[] } {
  const reasons: string[] = [];
  const report = checkCompatibility(contract, manifest.shared, manifest.nativeModules ?? []);
  for (const e of report.skew.entries) {
    if (e.status === "missing") reasons.push(`falta la dependencia compartida ${e.name}`);
    else if (e.status === "incompatible") {
      reasons.push(`${e.name} ${e.providedVersion ?? "?"} no cumple ${e.requiredRange}`);
    }
  }
  for (const m of report.native.missing) reasons.push(`falta el módulo nativo ${m}`);
  const min = manifest.minHostContract;
  if (min !== undefined) {
    if (!gteVersion(contract.contractVersion, min.contractVersion)) {
      reasons.push(`requiere contractVersion >= ${min.contractVersion} (host ${contract.contractVersion})`);
    }
    if (!gteVersion(contract.reactNative, min.reactNative)) {
      reasons.push(`requiere react-native >= ${min.reactNative} (host ${contract.reactNative})`);
    }
  }
  return { compatible: reasons.length === 0, reasons };
}
