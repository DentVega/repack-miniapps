import { hasHostBlock, selectVersion } from "@dentvega/miniapp-contract";
import type { ResolveRequest, ResolveResponse } from "@dentvega/miniapp-contract";
import type { ControlManifestClient } from "./controlManifestClient.js";
import type { FlagsClient } from "./FlagsClient.js";
import { ResolveFallbackError } from "./ResolveFallbackError.js";
import type { ResolveClient } from "./ResolveClient.js";

/**
 * Resolve guiado por el manifiesto de control firmado: flags (kill switch / canal) → versión
 * del manifiesto para este host y plataforma. Si el manifiesto no tiene bloque para el
 * contractVersion del host, delega en el resolve legacy. Ignora `req.version`.
 */
export function manifestResolveClient(opts: {
  manifests: ControlManifestClient;
  flags: FlagsClient;
  legacy: ResolveClient;
  hostContractVersion: string;
  subject: () => string | null;
}): ResolveClient {
  return {
    async resolve(req: ResolveRequest): Promise<ResolveResponse> {
      const flags = await opts.flags.evaluate(req.id, opts.subject());
      if (!flags.available) throw new ResolveFallbackError("disabled", `${req.id} deshabilitada`);

      const body = await opts.manifests.current();
      if (!hasHostBlock(body, opts.hostContractVersion)) return opts.legacy.resolve(req);

      const selected = selectVersion(
        body,
        opts.hostContractVersion,
        req.id,
        flags.channel,
        req.platform ?? "android",
      );
      if (selected === null) {
        throw new ResolveFallbackError(
          "no-compatible-version",
          `${req.id} sin versión para el host ${opts.hostContractVersion}`,
        );
      }
      const { artifact, entry, version } = selected;
      return {
        id: req.id,
        version,
        url: artifact.url,
        manifest: {
          ...entry.manifest,
          integrity: artifact.integrity,
          ...(artifact.signature !== undefined ? { signature: artifact.signature } : {}),
        },
      };
    },
  };
}
