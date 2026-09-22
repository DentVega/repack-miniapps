import { describe, expect, it } from "vitest";
import { blobStorage } from "../vercel-blob";
import { StorageError } from "../types";

function fakeDeps() {
  const puts: { path: string; opts: Record<string, unknown> }[] = [];
  const dels: string[][] = [];
  return {
    puts,
    dels,
    deps: {
      put: async (p: string, _body: Buffer, opts: Record<string, unknown>) => {
        puts.push({ path: p, opts });
        return { url: `https://blob.example.com/${p}` };
      },
      list: async () => ({ blobs: [{ url: "https://blob.example.com/app/1.0.0/a.bundle" }] }),
      del: async (urls: string[]) => {
        dels.push(urls);
      },
    },
  };
}

describe("blobStorage", () => {
  it("sube cada archivo y deriva la baseUrl del prefijo", async () => {
    const { puts, deps } = fakeDeps();
    const res = await blobStorage("tok", deps).putMany("app/1.0.0", [
      { path: "a.bundle", data: new Uint8Array([1]) },
    ]);
    expect(puts[0]!.path).toBe("app/1.0.0/a.bundle");
    // Debe sobreescribir: republicar la misma versión no puede dar 409.
    expect(puts[0]!.opts.allowOverwrite).toBe(true);
    expect(puts[0]!.opts.addRandomSuffix).toBe(false);
    expect(res.baseUrl).toBe("https://blob.example.com/app/1.0.0");
  });

  it("deletePrefix borra las URLs listadas", async () => {
    const { dels, deps } = fakeDeps();
    await blobStorage("tok", deps).deletePrefix("app/1.0.0");
    expect(dels[0]).toEqual(["https://blob.example.com/app/1.0.0/a.bundle"]);
  });

  it("tira StorageError si no hay archivos", async () => {
    const { deps } = fakeDeps();
    await expect(blobStorage("tok", deps).putMany("p", [])).rejects.toThrow(StorageError);
  });
});
