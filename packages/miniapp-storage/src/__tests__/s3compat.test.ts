import { describe, expect, it } from "vitest";
import { s3Compatible } from "../s3compat";
import { StorageError } from "../types";
import type { FetchInit, SignedFetch } from "../types";

const config = {
  endpoint: "https://acct123.r2.cloudflarestorage.com/chunks",
  region: "auto",
  accessKeyId: "ak",
  secretAccessKey: "sk",
  publicBaseUrl: "https://cdn.example.com/",
};

function recorder() {
  const calls: { url: string; init: FetchInit }[] = [];
  const fake: SignedFetch = async (url, init) => {
    calls.push({ url, init });
    if (init.method === "GET") {
      return {
        ok: true,
        status: 200,
        text: async () =>
          "<ListBucketResult><Contents><Key>app/1.0.0/a.bundle</Key></Contents>" +
          "<Contents><Key>app/1.0.0/b.bundle</Key></Contents></ListBucketResult>",
      };
    }
    return { ok: true, status: 200, text: async () => "" };
  };
  return { calls, fake };
}

describe("s3Compatible.putMany", () => {
  it("PUTea cada archivo al endpoint y devuelve la URL pública como baseUrl", async () => {
    const { calls, fake } = recorder();
    const res = await s3Compatible(config, fake).putMany("app/1.0.0", [
      { path: "app.container.js.bundle", data: new Uint8Array([1, 2]) },
      { path: "vendors.chunk.bundle", data: new Uint8Array([3]) },
    ]);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe(
      "https://acct123.r2.cloudflarestorage.com/chunks/app/1.0.0/app.container.js.bundle",
    );
    expect(calls[0]!.init.method).toBe("PUT");
    // La URL de lectura es OTRO host que la de escritura, y se le saca la barra final.
    expect(res.baseUrl).toBe("https://cdn.example.com/app/1.0.0");
  });

  it("manda content-type según la extensión", async () => {
    const { calls, fake } = recorder();
    await s3Compatible(config, fake).putMany("p", [
      { path: "a.bundle", data: new Uint8Array([1]) },
      { path: "b.json", data: new Uint8Array([2]) },
    ]);
    expect(calls[0]!.init.headers!["content-type"]).toBe("application/javascript");
    expect(calls[1]!.init.headers!["content-type"]).toBe("application/json");
  });

  it("pinea content-length solo si pinContentLength está activo", async () => {
    const withPin = recorder();
    await s3Compatible({ ...config, pinContentLength: true }, withPin.fake).putMany("p", [
      { path: "a.bundle", data: new Uint8Array([1, 2, 3]) },
    ]);
    expect(withPin.calls[0]!.init.headers!["content-length"]).toBe("3");

    const noPin = recorder();
    await s3Compatible(config, noPin.fake).putMany("p", [
      { path: "a.bundle", data: new Uint8Array([1, 2, 3]) },
    ]);
    expect(noPin.calls[0]!.init.headers!["content-length"]).toBeUndefined();
  });

  it("tira StorageError si no hay archivos", async () => {
    const { fake } = recorder();
    await expect(s3Compatible(config, fake).putMany("p", [])).rejects.toThrow(StorageError);
  });

  it("tira StorageError si el PUT devuelve no-ok", async () => {
    const fake: SignedFetch = async () => ({ ok: false, status: 403, text: async () => "" });
    await expect(
      s3Compatible(config, fake).putMany("p", [{ path: "a", data: new Uint8Array([1]) }]),
    ).rejects.toThrow(/403/);
  });
});

describe("s3Compatible.deletePrefix", () => {
  it("lista bajo el prefijo y borra cada key", async () => {
    const { calls, fake } = recorder();
    await s3Compatible(config, fake).deletePrefix("app/1.0.0");
    expect(calls[0]!.init.method).toBe("GET");
    expect(calls[0]!.url).toContain("list-type=2");
    expect(calls[0]!.url).toContain(encodeURIComponent("app/1.0.0/"));
    const deletes = calls.filter((c) => c.init.method === "DELETE").map((c) => c.url);
    expect(deletes).toEqual([
      "https://acct123.r2.cloudflarestorage.com/chunks/app/1.0.0/a.bundle",
      "https://acct123.r2.cloudflarestorage.com/chunks/app/1.0.0/b.bundle",
    ]);
  });

  it("no borra nada si el listado falla (best-effort)", async () => {
    const calls: string[] = [];
    const fake: SignedFetch = async (_url, init) => {
      calls.push(init.method);
      return { ok: false, status: 500, text: async () => "" };
    };
    await s3Compatible(config, fake).deletePrefix("p");
    expect(calls).toEqual(["GET"]);
  });
});
