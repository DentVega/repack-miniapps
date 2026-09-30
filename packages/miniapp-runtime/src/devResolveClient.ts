import type {ResolveResponse} from '@dentvega/miniapp-contract';
import {httpResolveClient, type ResolveClient} from './ResolveClient.js';

/** Parse DEV_REMOTES ("id=url,id2=url2") into a map. Malformed entries skipped. */
export function parseDevRemotes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const i = pair.indexOf('=');
    if (i <= 0) continue;
    const id = pair.slice(0, i).trim();
    const url = pair.slice(i + 1).trim();
    if (id && url) out[id] = url;
  }
  return out;
}

export function isDevRemote(id: string, devRemotes: Record<string, string>): boolean {
  return Object.prototype.hasOwnProperty.call(devRemotes, id);
}

/**
 * Dev-only ResolveClient: for ids in `devRemotes`, resolve to the miniapp's live
 * dev-server container (no integrity — pair with noopVerifier). Others delegate
 * to the real HTTP client. NEVER used outside __DEV__.
 */
export function devResolveClient(
  base: string,
  devRemotes: Record<string, string>,
  delegate: ResolveClient = httpResolveClient(base),
): ResolveClient {
  return {
    async resolve(request): Promise<ResolveResponse> {
      const devUrl = devRemotes[request.id];
      if (devUrl === undefined) return delegate.resolve(request);
      const id = request.id;
      return {
        id,
        version: '0.0.0' as ResolveResponse['version'],
        url: `${devUrl.replace(/\/+$/, '')}/${id}.container.js.bundle?platform=${request.platform ?? 'android'}`,
        manifest: {
          id,
          version: '0.0.0' as ResolveResponse['version'],
          entry: './Entry',
          shared: [],
          capabilities: [],
        } as ResolveResponse['manifest'],
      };
    },
  };
}
