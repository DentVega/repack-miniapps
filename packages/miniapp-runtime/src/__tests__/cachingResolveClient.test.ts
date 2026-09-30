import { cachingResolveClient } from "../cachingResolveClient.js";
import type { ResolveClient } from "../ResolveClient.js";
import type { ResolveResponse } from "@dentvega/miniapp-contract";

/** Inner falso que cuenta llamadas y devuelve una respuesta por la versión pedida. */
function fakeInner(): { client: ResolveClient; calls: () => number } {
  let n = 0;
  const client: ResolveClient = {
    async resolve(req): Promise<ResolveResponse> {
      n++;
      const version = (req.version ?? "9.9.9") as ResolveResponse["version"];
      return { id: req.id, version, url: `u/${req.id}/${version}`, manifest: {} as never };
    },
  };
  return { client, calls: () => n };
}

const id = "a" as ResolveResponse["id"];
const v = (s: string) => s as ResolveResponse["version"];

describe("cachingResolveClient", () => {
  it("cachea por (id, versión): el 2do resolve de la misma versión NO re-llama al inner", async () => {
    const { client, calls } = fakeInner();
    const c = cachingResolveClient(client);
    const r1 = await c.resolve({ id, version: v("1.0.0") });
    const r2 = await c.resolve({ id, version: v("1.0.0") });
    expect(r2).toEqual(r1);
    expect(calls()).toBe(1);
  });

  it("versión distinta → miss → re-llama (invalidación por rollback/publish)", async () => {
    const { client, calls } = fakeInner();
    const c = cachingResolveClient(client);
    await c.resolve({ id, version: v("1.0.0") });
    await c.resolve({ id, version: v("2.0.0") });
    expect(calls()).toBe(2);
  });

  it("sin version pasa derecho (no cachea)", async () => {
    const { client, calls } = fakeInner();
    const c = cachingResolveClient(client);
    await c.resolve({ id });
    await c.resolve({ id });
    expect(calls()).toBe(2);
  });

  it("un fallo del inner no se cachea (el próximo reintenta)", async () => {
    let n = 0;
    const client: ResolveClient = {
      async resolve(req): Promise<ResolveResponse> {
        n++;
        if (n === 1) throw new Error("boom");
        return { id: req.id, version: v("1.0.0"), url: "u", manifest: {} as never };
      },
    };
    const c = cachingResolveClient(client);
    await expect(c.resolve({ id, version: v("1.0.0") })).rejects.toThrow("boom");
    const r = await c.resolve({ id, version: v("1.0.0") });
    expect(r.version).toBe("1.0.0");
    expect(n).toBe(2);
  });
});
