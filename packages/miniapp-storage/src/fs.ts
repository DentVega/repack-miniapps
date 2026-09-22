import { promises as fs } from "node:fs";
import path from "node:path";
import { StorageError, type ChunkStorage } from "./types.js";

/**
 * Storage en disco, para desarrollo. NO sirve en serverless (el fs es efímero).
 * `root` es el directorio donde se escribe; `baseOrigin`, la URL desde la que se sirve.
 */
export function fsStorage(root: string, baseOrigin: string): ChunkStorage {
  const origin = baseOrigin.replace(/\/+$/, "");
  return {
    async putMany(prefix, files) {
      if (files.length === 0) throw new StorageError("no files to upload");
      const dest = path.join(root, prefix);
      await fs.mkdir(dest, { recursive: true });
      for (const file of files) {
        const target = path.join(dest, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.data);
      }
      return { baseUrl: `${origin}/${prefix}` };
    },
    async deletePrefix(prefix) {
      await fs.rm(path.join(root, prefix), { recursive: true, force: true });
    },
  };
}
