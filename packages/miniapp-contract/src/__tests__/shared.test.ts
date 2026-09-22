import type { SemVer, SharedDepSpec } from "../types.js";
import { gteVersion, satisfiesRange, satisfiesShared } from "../shared.js";

const v = (s: string): SemVer => s as SemVer;

describe("satisfiesRange", () => {
  it("any range accepts anything", () => {
    expect(satisfiesRange("1.0.0", "*")).toBe(true);
    expect(satisfiesRange("9.9.9", "")).toBe(true);
  });

  it("caret allows minor/patch within same major", () => {
    expect(satisfiesRange("0.76.6", "^0.76.0")).toBe(true);
    expect(satisfiesRange("0.99.0", "^0.76.0")).toBe(true);
    expect(satisfiesRange("1.0.0", "^0.76.0")).toBe(false);
    expect(satisfiesRange("0.75.0", "^0.76.0")).toBe(false);
  });

  it("tilde allows patch within same minor", () => {
    expect(satisfiesRange("18.3.9", "~18.3.1")).toBe(true);
    expect(satisfiesRange("18.4.0", "~18.3.1")).toBe(false);
  });

  it("exact requires equality", () => {
    expect(satisfiesRange("18.3.1", "18.3.1")).toBe(true);
    expect(satisfiesRange("18.3.2", "18.3.1")).toBe(false);
  });

  it("rejects malformed versions", () => {
    expect(satisfiesRange("1.2", "^1.0.0")).toBe(false);
  });
});

describe("satisfiesShared", () => {
  const req = (name: string, range: string): SharedDepSpec => ({
    name,
    requiredRange: range,
    singleton: true,
  });

  it("compatible when every dep is present and in range", () => {
    const result = satisfiesShared(
      { react: v("18.3.1"), "react-native": v("0.76.6") },
      [req("react", "^18.3.0"), req("react-native", "^0.76.0")],
    );
    expect(result.compatible).toBe(true);
    expect(result.entries.every((e) => e.status === "ok")).toBe(true);
  });

  it("flags a missing dep as skew", () => {
    const result = satisfiesShared({ react: v("18.3.1") }, [req("zustand", "^5.0.0")]);
    expect(result.compatible).toBe(false);
    expect(result.entries[0]?.status).toBe("missing");
  });

  it("flags an out-of-range dep as incompatible", () => {
    const result = satisfiesShared({ react: v("17.0.2") }, [req("react", "^18.0.0")]);
    expect(result.compatible).toBe(false);
    expect(result.entries[0]?.status).toBe("incompatible");
    expect(result.entries[0]?.providedVersion).toBe("17.0.2");
  });
});

describe("satisfiesShared — semver real", () => {
  const shared = (range: string) => [{ name: "react-native", requiredRange: range, singleton: true }];

  it("resuelve rangos con operadores compuestos (>=x <y)", () => {
    const r = satisfiesShared({ "react-native": "0.76.6" } as never, shared(">=0.76.0 <0.77.0") as never);
    expect(r.compatible).toBe(true);
  });
  it("resuelve OR (||)", () => {
    const r = satisfiesShared({ "react-native": "0.76.6" } as never, shared("0.75.x || 0.76.x") as never);
    expect(r.compatible).toBe(true);
  });
  it("resuelve x-ranges (0.76.x)", () => {
    const ok = satisfiesShared({ "react-native": "0.76.6" } as never, shared("0.76.x") as never);
    const no = satisfiesShared({ "react-native": "0.77.0" } as never, shared("0.76.x") as never);
    expect(ok.compatible).toBe(true);
    expect(no.compatible).toBe(false);
  });
  it("mantiene el caso caret 0.x (^0.76.6 excluye 0.77)", () => {
    expect(satisfiesShared({ "react-native": "0.77.0" } as never, shared("^0.76.6") as never).compatible).toBe(false);
    expect(satisfiesShared({ "react-native": "0.76.9" } as never, shared("^0.76.6") as never).compatible).toBe(true);
  });
});

describe("gteVersion", () => {
  it("igual → true", () => expect(gteVersion("1.0.0", "1.0.0")).toBe(true));
  it("mayor → true", () => {
    expect(gteVersion("1.2.0", "1.1.9")).toBe(true);
    expect(gteVersion("0.2.0", "0.1.5")).toBe(true);
  });
  it("menor → false", () => {
    expect(gteVersion("0.1.0", "0.2.0")).toBe(false);
    expect(gteVersion("1.0.0", "1.0.1")).toBe(false);
  });
  it("parse inválido → false", () => expect(gteVersion("x", "1.0.0")).toBe(false));
});
