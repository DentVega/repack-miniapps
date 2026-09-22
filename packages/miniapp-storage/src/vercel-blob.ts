import { StorageError, type ChunkStorage } from "./types.js";

/** Las tres funciones de @vercel/blob que usamos. Inyectables para testear sin el package. */
export interface BlobDeps {
  put(path: string, body: Buffer, opts: Record<string, unknown>): Promise<{ url: string }>;
  list(opts: Record<string, unknown>): Promise<{ blobs: { url: string }[] }>;
  del(urls: string[], opts: Record<string, unknown>): Promise<void>;
}

async function realDeps(): Promise<BlobDeps> {
  const mod = await import("@vercel/blob");
  return mod as unknown as BlobDeps;
}

/** Vercel Blob. Requiere el peer opcional `@vercel/blob` instalado. */
export function blobStorage(token?: string, deps?: BlobDeps): ChunkStorage {
  const get = async (): Promise<BlobDeps> => deps ?? (await realDeps());
  return {
    async putMany(prefix, files) {
      if (files.length === 0) throw new StorageError("no files to upload");
      const { put } = await get();
      try {
        let baseUrl = "";
        for (const file of files) {
          const { url } = await put(`${prefix}/${file.path}`, Buffer.from(file.data), {
            access: "public",
            addRandomSuffix: false,
            // Republicar la misma <id>/<version> debe sobreescribir, no 409ear.
            allowOverwrite: true,
            token,
          });
          if (baseUrl === "") baseUrl = url.slice(0, url.length - file.path.length - 1);
        }
        return { baseUrl };
      } catch (err) {
        if (err instanceof StorageError) throw err;
        throw new StorageError(err instanceof Error ? err.message : "blob upload failed");
      }
    },
    async deletePrefix(prefix) {
      const { list, del } = await get();
      const { blobs } = await list({ prefix: `${prefix}/`, token });
      if (blobs.length > 0) await del(blobs.map((b) => b.url), { token });
    },
  };
}
