import { describe, expect, it } from "vitest";
import { availableProviders, selectStorage, isStorageProvider } from "../provider";

const r2Env = {
  R2_ACCOUNT_ID: "a",
  R2_ACCESS_KEY_ID: "b",
  R2_SECRET_ACCESS_KEY: "c",
  R2_BUCKET: "d",
  R2_PUBLIC_BASE_URL: "e",
};

describe("isStorageProvider", () => {
  it("acepta los válidos y rechaza el resto", () => {
    expect(isStorageProvider("r2")).toBe(true);
    expect(isStorageProvider("azure")).toBe(true);
    expect(isStorageProvider("dropbox")).toBe(false);
    expect(isStorageProvider(null)).toBe(false);
  });
});

describe("availableProviders", () => {
  it("fs siempre está disponible", () => {
    expect(availableProviders({})).toEqual(["fs"]);
  });
  it("r2 si están las 5 vars, en precedencia sobre blob", () => {
    expect(availableProviders({ ...r2Env, BLOB_READ_WRITE_TOKEN: "t" })).toEqual([
      "r2",
      "blob",
      "fs",
    ]);
  });
  it("blob si está su token", () => {
    expect(availableProviders({ BLOB_READ_WRITE_TOKEN: "t" })).toEqual(["blob", "fs"]);
  });
});

describe("selectStorage", () => {
  const available = ["r2", "blob", "fs"] as const;
  it("sin preferencia ni override, el primero del env-order", () => {
    expect(selectStorage(available, null, null)).toBe("r2");
  });
  it("la preferencia gana sobre el env-order", () => {
    expect(selectStorage(available, "blob", null)).toBe("blob");
  });
  it("el override de la miniapp gana sobre la preferencia", () => {
    expect(selectStorage(available, "blob", "fs")).toBe("fs");
  });
  it("ignora una preferencia no disponible y cae al env-order", () => {
    expect(selectStorage(available, "azure", null)).toBe("r2");
  });
  it("ignora un override no disponible y cae a la preferencia", () => {
    expect(selectStorage(available, "blob", "azure")).toBe("blob");
  });
});
