import type { ChunkStorage, PutCall } from "./types";

/** Storage en memoria para tests: registra uploads y deletes, baseUrl determinística. */
export function mockStorage(): ChunkStorage & { puts: PutCall[]; deletes: string[] } {
  const puts: PutCall[] = [];
  const deletes: string[] = [];
  return {
    puts,
    deletes,
    async putMany(prefix, files) {
      puts.push({ prefix, files: [...files] });
      return { baseUrl: `https://mock.storage/${prefix}` };
    },
    async deletePrefix(prefix) {
      deletes.push(prefix);
    },
  };
}
