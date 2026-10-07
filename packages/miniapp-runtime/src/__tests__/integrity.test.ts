import { sha256Verifier } from "../integrity.js";
import { sha256Hex } from "../sha256.js";
import type { ResolveResponse } from "@dentvega/miniapp-contract";

const bytes = new TextEncoder().encode("federated-chunk-bytes");
const goodHash = `sha256-${sha256Hex(bytes)}`;

function fakeFetch(body: Uint8Array, ok = true): typeof fetch {
  return (async () => ({
    ok,
    arrayBuffer: async () => body.buffer,
  })) as unknown as typeof fetch;
}

function resolved(integrity?: string): ResolveResponse {
  return {
    id: "acc" as ResolveResponse["id"],
    version: "1.0.0" as ResolveResponse["version"],
    url: "https://cdn/x.bundle",
    manifest: { integrity } as ResolveResponse["manifest"],
  };
}

describe("sha256Verifier", () => {
  it("passes when the chunk hash matches the manifest", async () => {
    const v = sha256Verifier(fakeFetch(bytes));
    expect(await v.verify(resolved(goodHash))).toBe(true);
  });

  it("fails when the hash mismatches (tampered/corrupt chunk)", async () => {
    const v = sha256Verifier(fakeFetch(bytes));
    expect(await v.verify(resolved("sha256-deadbeef"))).toBe(false);
  });

  it("passes when no integrity is declared (legacy/unsigned)", async () => {
    const v = sha256Verifier(fakeFetch(bytes));
    expect(await v.verify(resolved(undefined))).toBe(true);
  });

  it("fails when the download errors", async () => {
    const v = sha256Verifier(fakeFetch(bytes, false));
    expect(await v.verify(resolved(goodHash))).toBe(false);
  });
});
