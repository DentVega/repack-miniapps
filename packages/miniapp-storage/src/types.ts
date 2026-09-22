/** Un archivo a subir, con su ruta relativa dentro del prefijo versionado. */
export interface StorageFile {
  readonly path: string;
  readonly data: Uint8Array;
}

/** Abstracción sobre el storage de chunks. Dos operaciones, nada más. */
export interface ChunkStorage {
  /** Sube todos los archivos bajo `prefix/`; devuelve la URL base pública de ese prefijo. */
  putMany(prefix: string, files: readonly StorageFile[]): Promise<{ baseUrl: string }>;
  /** Borra todos los objetos bajo `prefix/`. Best-effort (lo usa el prune). */
  deletePrefix(prefix: string): Promise<void>;
}

export class StorageError extends Error {
  readonly code = "STORAGE_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export interface FetchInit {
  method: string;
  body?: Uint8Array;
  headers?: Record<string, string>;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

/** Fetch inyectable. En prod lo provee aws4fetch (SigV4); en tests, un fake. */
export type SignedFetch = (url: string, init: FetchInit) => Promise<FetchResponse>;

/** Igual que SignedFetch, para adapters que no firman la request (Azure usa SAS). */
export type PlainFetch = SignedFetch;

/** Registro de una llamada a putMany, para el mock de tests. */
export interface PutCall {
  prefix: string;
  files: StorageFile[];
}
