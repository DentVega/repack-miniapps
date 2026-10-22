import { ed25519 } from "@noble/curves/ed25519.js";
import { controlManifestMessage, type ControlManifestBody } from "@dentvega/miniapp-contract";
import { controlManifestClient } from "../controlManifestClient.js";
import { memoryManifestStore } from "../manifestStore.js";
import { ResolveFallbackError } from "../ResolveFallbackError.js";
import { httpTrustBundleClient, canonicalBundleMessage, type TrustBundleClient } from "../trustBundle.js";
import { bytesToB64url } from "./_b64.js";

const secret = ed25519.utils.randomSecretKey();
const pub = bytesToB64url(ed25519.getPublicKey(secret));
const NOW = Date.parse("2026-10-21T12:00:00.000Z");

function body(seq: number, expiresAt: number): ControlManifestBody {
  return {
    schema: 1,
    seq,
    issuedAt: new Date(NOW - 1000).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    hosts: {},
    versions: {},
  };
}
function sign(b: ControlManifestBody, key: Uint8Array = secret): string {
  const sig = ed25519.sign(new TextEncoder().encode(controlManifestMessage(b)), key);
  return JSON.stringify({ body: b, signature: bytesToB64url(sig) });
}
const bundle = (keys: Record<string, string> | null): TrustBundleClient => ({ keys: async () => keys });
const okFetch = (raw: string) =>
  (async () => ({ ok: true, status: 200, json: async () => JSON.parse(raw) })) as unknown as typeof fetch;
const failFetch = (async () => {
  throw new Error("sin red");
}) as unknown as typeof fetch;

function make(opts: {
  raw?: string;
  fetchImpl?: typeof fetch;
  keys?: Record<string, string> | null;
  mode?: "warn" | "enforce";
  stored?: string;
}) {
  const store = memoryManifestStore();
  if (opts.stored !== undefined) void store.save(opts.stored);
  const client = controlManifestClient({
    baseUrl: "http://x",
    trustBundle: bundle(opts.keys === undefined ? { _manifest: pub } : opts.keys),
    store,
    mode: opts.mode ?? "enforce",
    now: () => NOW,
    fetchImpl: opts.fetchImpl ?? okFetch(opts.raw ?? ""),
  });
  return { client, store };
}
const FUTURE = NOW + 3_600_000;

describe("controlManifestClient", () => {
  it("acepta un manifiesto bien firmado y lo guarda", async () => {
    const raw = sign(body(10, FUTURE));
    const { client, store } = make({ raw });
    expect((await client.current()).seq).toBe(10);
    expect(JSON.parse((await store.load())!).body.seq).toBe(10);
  });

  it("rechaza una firma inválida y conserva el guardado", async () => {
    const stored = sign(body(5, FUTURE));
    const bad = sign(body(10, FUTURE), ed25519.utils.randomSecretKey());
    const { client, store } = make({ raw: bad, stored });
    expect((await client.current()).seq).toBe(5);
    expect(await store.load()).toBe(stored);
  });

  it("firma inválida también se rechaza en modo warn", async () => {
    const bad = sign(body(10, FUTURE), ed25519.utils.randomSecretKey());
    const { client } = make({ raw: bad, mode: "warn" });
    await expect(client.current()).rejects.toMatchObject({ reason: "resolve-failed" });
  });

  it("rechaza uno expirado más allá de la tolerancia", async () => {
    const raw = sign(body(10, NOW - 400_000));
    const { client } = make({ raw });
    await expect(client.current()).rejects.toBeInstanceOf(ResolveFallbackError);
  });

  it("acepta uno vencido hace 200 s (dentro de la tolerancia)", async () => {
    const raw = sign(body(10, NOW - 200_000));
    const { client } = make({ raw });
    expect((await client.current()).seq).toBe(10);
  });

  it("rechaza un seq menor que el guardado (anti-replay)", async () => {
    const stored = sign(body(20, FUTURE));
    const old = sign(body(10, FUTURE));
    const { client, store } = make({ raw: old, stored });
    expect((await client.current()).seq).toBe(20);
    expect(await store.load()).toBe(stored);
  });

  it("sin red usa el guardado válido", async () => {
    const stored = sign(body(5, FUTURE));
    const { client } = make({ fetchImpl: failFetch, stored });
    expect((await client.current()).seq).toBe(5);
  });

  it("sin red y con el guardado expirado lanza resolve-failed", async () => {
    const stored = sign(body(5, NOW - 400_000));
    const { client } = make({ fetchImpl: failFetch, stored });
    await expect(client.current()).rejects.toMatchObject({ reason: "resolve-failed" });
  });

  it("sin red y sin guardado lanza resolve-failed", async () => {
    const { client } = make({ fetchImpl: failFetch });
    await expect(client.current()).rejects.toMatchObject({ reason: "resolve-failed" });
  });

  it("guardado con firma adulterada no se usa como fallback", async () => {
    const stored = sign(body(5, FUTURE), ed25519.utils.randomSecretKey());
    const { client } = make({ fetchImpl: failFetch, stored });
    await expect(client.current()).rejects.toMatchObject({ reason: "resolve-failed" });
  });

  it("guardado corrupto no bloquea el anti-replay: acepta el nuevo", async () => {
    const raw = sign(body(1, FUTURE));
    const { client } = make({ raw, stored: "{no es json" });
    expect((await client.current()).seq).toBe(1);
  });

  it("modo warn sin _manifest en el bundle acepta", async () => {
    const raw = sign(body(10, FUTURE), ed25519.utils.randomSecretKey());
    const { client } = make({ raw, keys: {}, mode: "warn" });
    expect((await client.current()).seq).toBe(10);
  });

  it("modo enforce sin _manifest rechaza", async () => {
    const raw = sign(body(10, FUTURE));
    const { client } = make({ raw, keys: {}, mode: "enforce" });
    await expect(client.current()).rejects.toMatchObject({ reason: "resolve-failed" });
  });

  it("un guardado con firma ajena y seq enorme no bloquea un manifiesto legítimo", async () => {
    const stored = sign(body(1e15, FUTURE), ed25519.utils.randomSecretKey());
    const raw = sign(body(10, FUTURE));
    const { client, store } = make({ raw, stored });
    expect((await client.current()).seq).toBe(10);
    expect(JSON.parse((await store.load())!).body.seq).toBe(10);
  });

  it("un guardado genuino pero expirado sigue fijando el piso anti-replay", async () => {
    const stored = sign(body(20, NOW - 400_000));
    const old = sign(body(10, FUTURE));
    const { client } = make({ raw: old, stored });
    await expect(client.current()).rejects.toMatchObject({ reason: "resolve-failed" });
  });

  it("si el GET nunca responde, a los 2000 ms usa el guardado válido", async () => {
    jest.useFakeTimers();
    try {
      const stored = sign(body(5, FUTURE));
      const { client } = make({ fetchImpl: (() => new Promise(() => {})) as unknown as typeof fetch, stored });
      const p = client.current();
      await jest.advanceTimersByTimeAsync(2000);
      expect((await p).seq).toBe(5);
    } finally {
      jest.useRealTimers();
    }
  });

  it("enforce offline con bundle y manifiesto guardados válidos: resuelve", async () => {
    const root = ed25519.utils.randomSecretKey();
    const tb = { version: 1, updatedAt: "2026-10-01T00:00:00.000Z", keys: { _manifest: pub } };
    const signedTb = {
      bundle: tb,
      signature: bytesToB64url(ed25519.sign(new TextEncoder().encode(canonicalBundleMessage(tb)), root)),
    };
    const tbStore = memoryManifestStore();
    await tbStore.save(JSON.stringify(signedTb));
    const manifestStore = memoryManifestStore();
    await manifestStore.save(sign(body(7, FUTURE)));
    const client = controlManifestClient({
      baseUrl: "http://x",
      trustBundle: httpTrustBundleClient("http://x", bytesToB64url(ed25519.getPublicKey(root)), failFetch, {
        store: tbStore,
      }),
      store: manifestStore,
      mode: "enforce",
      now: () => NOW,
      fetchImpl: failFetch,
    });
    expect((await client.current()).seq).toBe(7);
  });
});
