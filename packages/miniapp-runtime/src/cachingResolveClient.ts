import type { ResolveClient } from "./ResolveClient.js";
import type { ResolveResponse } from "@dentvega/miniapp-contract";

/**
 * Envuelve un ResolveClient con un cache in-memory por `(id, versión)`. Un resolve
 * de una versión concreta es INMUTABLE (la URL del chunk incluye la versión) → se
 * cachea para toda la sesión. La invalidación viaja por la versión: cuando el
 * catálogo sirve otra `servedVersion` (pin/rollback/publish), la llave cambia y se
 * re-resuelve — el rollback sigue tan rápido como el refetch del catálogo.
 *
 * Solo cachea cuando el request trae `version` (determinístico). Sin versión pasa
 * derecho (el server elige; no se cachea). Los fallos NO se cachean.
 *
 * Es además el hook natural para métricas (hits vs misses = resolves reales al backend).
 */
export function cachingResolveClient(inner: ResolveClient): ResolveClient {
  const cache = new Map<string, ResolveResponse>();
  return {
    async resolve(request) {
      const lookup = request.version ? `${request.id}@${request.version}` : null;
      if (lookup !== null) {
        const hit = cache.get(lookup);
        if (hit !== undefined) return hit;
      }
      const res = await inner.resolve(request);
      cache.set(`${request.id}@${res.version}`, res);
      return res;
    },
  };
}
