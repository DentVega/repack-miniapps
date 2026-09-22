# repack-miniapps

Building blocks for miniapp platforms built on [Re.Pack](https://re-pack.dev/) and Module
Federation: publish miniapp chunks to the cloud of your choice, and load them at runtime with
integrity and signature verification.

## Packages

| Package | What it does |
| --- | --- |
| [`@dentvega/miniapp-contract`](packages/miniapp-contract) | Shared types between the mobile host and the registry: manifest, resolve shape, capabilities, version-skew logic. |
| [`@dentvega/miniapp-storage`](packages/miniapp-storage) | Multi-cloud chunk storage behind one interface: Cloudflare R2, AWS S3, Google Cloud Storage, Azure Blob, Vercel Blob, and local fs. |

## Install

```bash
npm install @dentvega/miniapp-storage
```

## Quick start

```ts
import { s3Storage, availableProviders, selectStorage } from "@dentvega/miniapp-storage";

const storage = s3Storage({
  bucket: "my-bucket",
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  publicBaseUrl: "https://cdn.example.com",
});

const { baseUrl } = await storage.putMany("my-app/1.0.0", [
  { path: "my-app.container.js.bundle", data: bundleBytes },
]);
```

Every adapter implements the same two-method interface, so swapping providers is a config
change:

```ts
interface ChunkStorage {
  putMany(prefix: string, files: readonly StorageFile[]): Promise<{ baseUrl: string }>;
  deletePrefix(prefix: string): Promise<void>;
}
```

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

## License

MIT
