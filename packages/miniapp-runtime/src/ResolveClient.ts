import type { ResolveRequest, ResolveResponse } from "@dentvega/miniapp-contract";

/** Asks Backstage which version/url to mount. */
export interface ResolveClient {
  resolve(request: ResolveRequest): Promise<ResolveResponse>;
}

/** HTTP client hitting Backstage `GET /api/resolve`. */
export function httpResolveClient(baseUrl: string): ResolveClient {
  return {
    async resolve(request: ResolveRequest): Promise<ResolveResponse> {
      // Build the query manually: React Native's URL polyfill does NOT implement
      // URLSearchParams.set (throws "not implemented" on Hermes), so `new URL` +
      // searchParams cannot be used here even though it works under Node in tests.
      const params = [`id=${encodeURIComponent(request.id)}`];
      if (request.hostVersion !== undefined) {
        params.push(`hostVersion=${encodeURIComponent(request.hostVersion)}`);
      }
      if (request.version !== undefined) {
        params.push(`version=${encodeURIComponent(request.version)}`);
      }
      if (request.platform !== undefined) {
        params.push(`platform=${encodeURIComponent(request.platform)}`);
      }
      const url = `${baseUrl.replace(/\/+$/, "")}/api/resolve?${params.join("&")}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`resolve failed: HTTP ${res.status}`);
      }
      return (await res.json()) as ResolveResponse;
    },
  };
}
