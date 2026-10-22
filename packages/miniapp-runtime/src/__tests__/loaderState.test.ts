import { isRetryable } from "../loaderState.js";
import type { FallbackReason } from "../loaderState.js";

describe("isRetryable — razones de firma", () => {
  it("invalid-signature y unknown-key NO son retryables", () => {
    expect(isRetryable("invalid-signature")).toBe(false);
    expect(isRetryable("unknown-key")).toBe(false);
  });
  it("integrity-failed sigue retryable, skew no", () => {
    expect(isRetryable("integrity-failed")).toBe(true);
    expect(isRetryable("skew")).toBe(false);
  });
  it("acepta las razones nuevas como FallbackReason (typecheck)", () => {
    const a: FallbackReason = "invalid-signature";
    const b: FallbackReason = "unknown-key";
    expect([a, b]).toHaveLength(2);
  });
});

describe("isRetryable — motivos de la torre", () => {
  it("disabled y no-compatible-version NO son retryables", () => {
    expect(isRetryable("disabled")).toBe(false);
    expect(isRetryable("no-compatible-version")).toBe(false);
  });
});
