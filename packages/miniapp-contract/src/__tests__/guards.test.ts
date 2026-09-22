import { isManifest, parseMiniappId, parseSemVer } from "../guards.js";

describe("parseSemVer", () => {
  it.each(["0.0.0", "1.2.3", "10.20.30"])("accepts %s", (v) => {
    expect(parseSemVer(v)).toBe(v);
  });
  it.each(["1.2", "1.2.3.4", "v1.2.3", "1.2.x", "01.2.3", ""])("rejects %s", (v) => {
    expect(parseSemVer(v)).toBeNull();
  });
});

describe("parseMiniappId", () => {
  it.each(["accounts", "account-dashboard", "foo_bar", "a1"])("accepts %s", (v) => {
    expect(parseMiniappId(v)).toBe(v);
  });
  it.each(["", "Account", "foo bar", "-lead", "trail-", "foo--bar"])("rejects %s", (v) => {
    expect(parseMiniappId(v)).toBeNull();
  });
});

describe("isManifest", () => {
  const valid = {
    id: "account-dashboard",
    version: "0.1.0",
    entry: "./Entry",
    shared: [{ name: "react-native", requiredRange: "^0.76.0", singleton: true }],
    capabilities: ["accounts:read"],
  };

  it("accepts a well-formed manifest", () => {
    expect(isManifest(valid)).toBe(true);
  });

  it("accepts an optional integrity string", () => {
    expect(isManifest({ ...valid, integrity: "sha256-abc" })).toBe(true);
  });

  it("accepts an optional signature string", () => {
    expect(isManifest({ ...valid, signature: "ed-b64url" })).toBe(true);
  });

  it("accepts a manifest with a valid minHostContract", () => {
    expect(
      isManifest({ ...valid, minHostContract: { reactNative: "0.76.6", contractVersion: "1.0.0" } })
    ).toBe(true);
  });

  it("accepts a manifest without minHostContract (optional)", () => {
    expect(isManifest(valid)).toBe(true);
  });

  it("rejects a manifest with a malformed minHostContract", () => {
    expect(isManifest({ ...valid, minHostContract: { reactNative: 1 } })).toBe(false);
  });

  it.each([
    ["null", null],
    ["missing version", { ...valid, version: undefined }],
    ["bad semver", { ...valid, version: "1.2" }],
    ["bad id", { ...valid, id: "Bad Id" }],
    ["empty entry", { ...valid, entry: "" }],
    ["unknown capability", { ...valid, capabilities: ["wire:money"] }],
    ["shared not array", { ...valid, shared: {} }],
    ["bad shared entry", { ...valid, shared: [{ name: "react", singleton: true }] }],
    ["numeric integrity", { ...valid, integrity: 123 }],
    ["numeric signature", { ...valid, signature: 123 }],
  ])("rejects %s", (_label, input) => {
    expect(isManifest(input)).toBe(false);
  });
});
