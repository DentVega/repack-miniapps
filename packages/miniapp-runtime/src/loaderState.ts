import type { ResolveResponse } from "@dentvega/miniapp-contract";

export type FallbackReason =
  | "resolve-failed"
  | "download-failed"
  | "invalid-manifest"
  | "skew"
  | "integrity-failed"
  | "host-too-old"
  | "invalid-signature"
  | "unknown-key";

const RETRYABLE_REASONS: ReadonlySet<FallbackReason> = new Set([
  "resolve-failed",
  "download-failed",
  "integrity-failed",
]);

/** Retryable = transient (network/CDN/partial download); permanent = skew / invalid-manifest. */
export function isRetryable(reason: FallbackReason): boolean {
  return RETRYABLE_REASONS.has(reason);
}

export type LoaderState =
  | { status: "idle" }
  | { status: "resolving" }
  | { status: "downloading"; resolved: ResolveResponse }
  | { status: "mounted"; resolved: ResolveResponse }
  | { status: "fallback"; reason: FallbackReason; detail?: string };

export type LoaderEvent =
  | { type: "start" }
  | { type: "resolved"; resolved: ResolveResponse }
  | { type: "mounted" }
  | { type: "fail"; reason: FallbackReason; detail?: string };

export const initialLoaderState: LoaderState = { status: "idle" };

/** Pure reducer for the loader lifecycle. A failure never throws — it maps to fallback. */
export function nextLoaderState(state: LoaderState, event: LoaderEvent): LoaderState {
  switch (event.type) {
    case "start":
      return { status: "resolving" };
    case "resolved":
      return { status: "downloading", resolved: event.resolved };
    case "mounted":
      return state.status === "downloading"
        ? { status: "mounted", resolved: state.resolved }
        : state;
    case "fail":
      return { status: "fallback", reason: event.reason, detail: event.detail };
    default:
      return state;
  }
}
