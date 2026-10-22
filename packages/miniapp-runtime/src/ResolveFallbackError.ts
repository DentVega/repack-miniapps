import type { FallbackReason } from "./loaderState.js";

/** Error de resolve con motivo de fallback propio: `useMiniapp` lo respeta en vez de "resolve-failed". */
export class ResolveFallbackError extends Error {
  constructor(
    readonly reason: FallbackReason,
    detail?: string,
  ) {
    super(detail ?? reason);
    this.name = "ResolveFallbackError";
  }
}
