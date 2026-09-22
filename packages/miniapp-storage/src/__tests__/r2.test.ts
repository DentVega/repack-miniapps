import { describe, expect, it } from "vitest";
import { r2Storage, r2ConfigFromEnv } from "../r2";
import type { FetchInit, SignedFetch } from "../types";

const config = {
  accountId: "acct123",
  accessKeyId: "ak",
  secretAccessKey: "sk",
  bucket: "chunks",
  publicBaseUrl: "https://cdn.example.com/",
};

describe("r2ConfigFromEnv", () => {
  it("null si falta alguna de las 5 vars", () => {
    expect(r2ConfigFromEnv({ R2_ACCOUNT_ID: "x" })).toBeNull();
  });
  it("devuelve la config con las 5", () => {
    expect(
      r2ConfigFromEnv({
        R2_ACCOUNT_ID: "a",
        R2_ACCESS_KEY_ID: "b",
        R2_SECRET_ACCESS_KEY: "c",
        R2_BUCKET: "d",
        R2_PUBLIC_BASE_URL: "e",
      }),
    ).toEqual({
      accountId: "a",
      accessKeyId: "b",
      secretAccessKey: "c",
      bucket: "d",
      publicBaseUrl: "e",
    });
  });
});

describe("r2Storage", () => {
  it("escribe al endpoint S3 de R2 y pinea content-length (R2 rechaza chunked)", async () => {
    const calls: { url: string; init: FetchInit }[] = [];
    const fake: SignedFetch = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => "" };
    };
    const res = await r2Storage(config, fake).putMany("app/1.0.0", [
      { path: "app.container.js.bundle", data: new Uint8Array([1, 2]) },
    ]);
    expect(calls[0]!.url).toBe(
      "https://acct123.r2.cloudflarestorage.com/chunks/app/1.0.0/app.container.js.bundle",
    );
    expect(calls[0]!.init.headers!["content-length"]).toBe("2");
    expect(res.baseUrl).toBe("https://cdn.example.com/app/1.0.0");
  });
});
