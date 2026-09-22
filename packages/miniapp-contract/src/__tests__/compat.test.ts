import { checkCompatibility, checkNativeModules } from "../compat.js";
import type { HostContract } from "../types.js";

describe("checkNativeModules", () => {
  const host = ["react-native-screens", "react-native-safe-area-context"];

  it("compatible cuando todos los natives de la miniapp están en el host", () => {
    const r = checkNativeModules(host, ["react-native-screens"]);
    expect(r.compatible).toBe(true);
    expect(r.missing).toEqual([]);
  });
  it("incompatible listando los que faltan", () => {
    const r = checkNativeModules(host, ["react-native-screens", "react-native-svg", "react-native-mmkv"]);
    expect(r.compatible).toBe(false);
    expect(r.missing).toEqual(["react-native-svg", "react-native-mmkv"]);
  });
  it("miniapp sin natives → compatible", () => {
    expect(checkNativeModules(host, [])).toEqual({ compatible: true, missing: [] });
  });
});

const contract: HostContract = {
  contractVersion: "1.0.0",
  reactNative: "0.76.6",
  shared: { react: "18.3.1", "react-native": "0.76.6" },
  nativeModules: ["react-native-screens"],
};

describe("checkCompatibility", () => {
  it("compatible: skew ok + natives presentes", () => {
    const r = checkCompatibility(
      contract,
      [{ name: "react-native", requiredRange: "^0.76.0", singleton: true }],
      ["react-native-screens"],
    );
    expect(r.compatible).toBe(true);
    expect(r.skew.compatible).toBe(true);
    expect(r.native.compatible).toBe(true);
  });
  it("incompatible por skew (RN fuera de rango)", () => {
    const r = checkCompatibility(
      contract,
      [{ name: "react-native", requiredRange: "^0.77.0", singleton: true }],
      [],
    );
    expect(r.compatible).toBe(false);
    expect(r.skew.compatible).toBe(false);
  });
  it("incompatible por native faltante", () => {
    const r = checkCompatibility(contract, [], ["react-native-svg"]);
    expect(r.compatible).toBe(false);
    expect(r.native.missing).toEqual(["react-native-svg"]);
  });
});
