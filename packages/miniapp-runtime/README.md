# @dentvega/miniapp-runtime

Host-side runtime for React Native apps that load miniapps with Re.Pack / Module Federation:
**resolve → verify → mount → fallback**.

- Resolves the served version from your registry (`httpResolveClient`, with a per-version cache).
- Checks shared-dependency skew and `minHostContract` before mounting.
- Verifies chunk integrity (SHA-256) and Ed25519 signatures against a signed trust bundle
  (`warn` or `enforce`).
- Auto-retries transient failures, reports metrics, and falls back without crashing.

It is **headless**: it ships no design system. Bring your own loading and error UI, and your own
`ChunkLoader` (the Re.Pack / Module Federation wiring stays in your app).

## Install

```bash
npm install @dentvega/miniapp-runtime
```

`react` (>=18) and `react-native` (>=0.76) are peer dependencies.

## Usage

```tsx
import {
  MiniappHost,
  httpResolveClient,
  sha256Verifier,
  createScopedGrant,
  type ChunkLoader,
  type HostProvided,
} from "@dentvega/miniapp-runtime";
import { parseMiniappId, parseSemVer } from "@dentvega/miniapp-contract";

const resolveClient = httpResolveClient("https://registry.example.com");

const chunkLoader: ChunkLoader = {
  async load(resolved) {
    // Your Re.Pack / Module Federation container loader: use `resolved.url` and
    // `resolved.manifest.entry` (e.g. "./Entry") to load and return the miniapp's
    // exposed Entry component. This wiring stays in your app.
    throw new Error("TODO: implement your ChunkLoader");
  },
};

const version = (v: string) => parseSemVer(v)!;
const hostProvided: HostProvided = {
  react: version("18.3.1"),
  "react-native": version("0.76.6"),
};

export function MiniappScreen({ id }: { id: string }) {
  const { grant } = createScopedGrant(["accounts:read"]);
  const miniappId = parseMiniappId(id);
  if (miniappId === null) return null; // invalid id, handle as you see fit

  return (
    <MiniappHost
      id={miniappId}
      resolveClient={resolveClient}
      chunkLoader={chunkLoader}
      hostProvided={hostProvided}
      capabilities={grant}
      integrity={sha256Verifier()}
      render={{ loading: MyLoading, error: MyError }}
    />
  );
}
```

### Custom UI

```ts
render?: {
  loading?: ComponentType<{ retrying: boolean }>;
  error?: ComponentType<{ reason: FallbackReason; retryable: boolean; onRetry: () => void }>;
}
```

Without `render`, plain React Native primitives are used, with the English messages in
`DEFAULT_FALLBACK_MESSAGES`.

## License

MIT
