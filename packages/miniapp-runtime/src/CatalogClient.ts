/** The host asks Backstage for the published catalog to render a dynamic home. */

/** One row of the catalog (Backstage `GET /api/miniapps`). */
export interface MiniappSummary {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  /** Highest published version, or null if none is published yet. */
  readonly latestVersion: string | null;
  /**
   * Version the host actually serves (pinnedVersion ?? latest). Optional para
   * tolerar backends viejos que aún no lo exponen → el host cae a latestVersion.
   */
  readonly servedVersion?: string | null;
  readonly versionCount: number;
}

export interface CatalogClient {
  list(): Promise<readonly MiniappSummary[]>;
}

/** HTTP client hitting Backstage `GET /api/miniapps`. */
export function httpCatalogClient(baseUrl: string): CatalogClient {
  return {
    async list(): Promise<readonly MiniappSummary[]> {
      const url = `${baseUrl.replace(/\/+$/, "")}/api/miniapps`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`catalog failed: HTTP ${res.status}`);
      }
      const body = (await res.json()) as { miniapps?: MiniappSummary[] };
      return body.miniapps ?? [];
    },
  };
}
