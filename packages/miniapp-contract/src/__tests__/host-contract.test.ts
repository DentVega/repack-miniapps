import { isHostContract } from "../guards.js";
import type { HostContract } from "../types.js";

const VALID: HostContract = {
  contractVersion: "1.0.0",
  reactNative: "0.76.6",
  shared: { react: "18.3.1", "react-native": "0.76.6" },
  nativeModules: ["react-native-screens"],
};

describe("isHostContract", () => {
  it("accepts a valid contract", () => expect(isHostContract(VALID)).toBe(true));
  it("accepts a contract with capabilitySince (optional provenance)", () => {
    const withSince: HostContract = {
      ...VALID,
      capabilitySince: { shared: { react: "0.1.0" }, native: { "react-native-screens": "0.1.0" } },
    };
    expect(isHostContract(withSince)).toBe(true);
  });
  it("rejects bad shapes", () => {
    expect(isHostContract(null)).toBe(false);
    expect(isHostContract({ ...VALID, shared: "x" })).toBe(false);
    expect(isHostContract({ ...VALID, shared: { react: 123 } })).toBe(false);
    expect(isHostContract({ ...VALID, nativeModules: "x" })).toBe(false);
    expect(isHostContract({ ...VALID, nativeModules: [1] })).toBe(false);
    expect(isHostContract({ contractVersion: "1.0.0" })).toBe(false);
  });
});
