import { signatureGate } from "../signatureGate.js";

describe("signatureGate", () => {
  it("ok/skip → no bloquea, sin métrica (cualquier modo)", () => {
    for (const mode of ["warn", "enforce"] as const) {
      expect(signatureGate("ok", mode)).toEqual({ block: false });
      expect(signatureGate("skip", mode)).toEqual({ block: false });
    }
  });

  it("warn: invalid/missing → no bloquea, métrica invalid-signature", () => {
    expect(signatureGate("invalid", "warn")).toEqual({ block: false, metric: "invalid-signature" });
    expect(signatureGate("missing", "warn")).toEqual({ block: false, metric: "invalid-signature" });
  });

  it("warn: unknown-key → no bloquea, métrica unknown-key", () => {
    expect(signatureGate("unknown-key", "warn")).toEqual({ block: false, metric: "unknown-key" });
  });

  it("enforce: invalid/missing → bloquea con invalid-signature", () => {
    expect(signatureGate("invalid", "enforce")).toEqual({ block: true, reason: "invalid-signature" });
    expect(signatureGate("missing", "enforce")).toEqual({ block: true, reason: "invalid-signature" });
  });

  it("enforce: unknown-key → bloquea con unknown-key", () => {
    expect(signatureGate("unknown-key", "enforce")).toEqual({ block: true, reason: "unknown-key" });
  });
});
