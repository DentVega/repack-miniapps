import { httpMetricsClient, noopMetricsClient } from "../MetricsClient.js";

describe("httpMetricsClient", () => {
  it("postea el evento envuelto en {events:[...]} a /api/metrics", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      return { ok: true, status: 200 } as Response;
    }) as unknown as typeof fetch;

    httpMetricsClient("https://b.example/").track({ type: "mount", id: "a", version: "1.0.0" });
    await Promise.resolve(); // deja correr el fire-and-forget

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://b.example/api/metrics");
    expect(calls[0]!.body).toEqual({ events: [{ type: "mount", id: "a", version: "1.0.0" }] });
  });

  it("no tira si el fetch rechaza (best-effort)", () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    expect(() =>
      httpMetricsClient("https://b.example").track({ type: "fallback", id: "a", reason: "skew" }),
    ).not.toThrow();
  });

  it("noopMetricsClient no hace nada ni tira", () => {
    expect(() => noopMetricsClient.track({ type: "mount", id: "a" })).not.toThrow();
  });
});
