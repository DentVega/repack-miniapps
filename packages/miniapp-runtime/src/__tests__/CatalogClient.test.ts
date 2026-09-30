import { httpCatalogClient } from "../CatalogClient.js";

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("httpCatalogClient", () => {
  it("returns the miniapps list", async () => {
    globalThis.fetch = fakeFetch(200, {
      miniapps: [
        { id: "a", name: "A", owner: "team", latestVersion: "1.0.0", versionCount: 2 },
        { id: "b", name: "B", owner: "team", latestVersion: null, versionCount: 0 },
      ],
    });
    const client = httpCatalogClient("https://backstage.example/");
    const list = await client.list();
    expect(list).toHaveLength(2);
    expect(list[0]?.latestVersion).toBe("1.0.0");
    expect(list[1]?.latestVersion).toBeNull();
  });

  it("returns [] when the payload has no miniapps", async () => {
    globalThis.fetch = fakeFetch(200, {});
    expect(await httpCatalogClient("https://x").list()).toEqual([]);
  });

  it("throws on a non-2xx response", async () => {
    globalThis.fetch = fakeFetch(500, {});
    await expect(httpCatalogClient("https://x").list()).rejects.toThrow("HTTP 500");
  });
});
