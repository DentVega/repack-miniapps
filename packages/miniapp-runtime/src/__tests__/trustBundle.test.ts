import { ed25519 } from "@noble/curves/ed25519.js";
import { httpTrustBundleClient, canonicalBundleMessage } from "../trustBundle.js";
import { bytesToB64url } from "./_b64.js";

function makeBundle(rootSecret: Uint8Array, keys: Record<string, string>) {
  const body = { version: 1, updatedAt: "2026-08-27T00:00:00.000Z", keys };
  const sig = ed25519.sign(new TextEncoder().encode(canonicalBundleMessage(body)), rootSecret);
  return { bundle: body, signature: bytesToB64url(sig) };
}
const fetchOf = (obj: unknown, ok = true) =>
  (async () => ({ ok, json: async () => obj, status: ok ? 200 : 404 })) as unknown as typeof fetch;

describe("httpTrustBundleClient", () => {
  const rootSecret = ed25519.utils.randomSecretKey();
  const rootPub = bytesToB64url(ed25519.getPublicKey(rootSecret));

  it("devuelve el mapa keys cuando la firma root verifica", async () => {
    const signed = makeBundle(rootSecret, { acc: "PKacc" });
    const client = httpTrustBundleClient("http://x", rootPub, fetchOf(signed));
    expect(await client.keys()).toEqual({ acc: "PKacc" });
  });

  it("devuelve null si la firma root no verifica (otra root)", async () => {
    const other = ed25519.utils.randomSecretKey();
    const signed = makeBundle(other, { acc: "PKacc" });
    const client = httpTrustBundleClient("http://x", rootPub, fetchOf(signed));
    expect(await client.keys()).toBeNull();
  });

  it("devuelve null sin root key pineada", async () => {
    const signed = makeBundle(rootSecret, { acc: "PKacc" });
    const client = httpTrustBundleClient("http://x", "", fetchOf(signed));
    expect(await client.keys()).toBeNull();
  });

  it("devuelve null si el endpoint da 404", async () => {
    const client = httpTrustBundleClient("http://x", rootPub, fetchOf({}, false));
    expect(await client.keys()).toBeNull();
  });

  it("cachea: no re-fetchea en la segunda llamada", async () => {
    const signed = makeBundle(rootSecret, { acc: "PKacc" });
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return { ok: true, json: async () => signed, status: 200 };
    }) as unknown as typeof fetch;
    const client = httpTrustBundleClient("http://x", rootPub, fetchImpl);
    await client.keys();
    await client.keys();
    expect(calls).toBe(1);
  });
});
