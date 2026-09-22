export type {
  ChunkStorage,
  StorageFile,
  SignedFetch,
  PlainFetch,
  FetchInit,
  FetchResponse,
  PutCall,
} from "./types";
export { StorageError } from "./types";
export { s3Compatible, contentType, signedFetchFor, type S3CompatConfig } from "./s3compat";
export { r2Storage, r2ConfigFromEnv, type R2Config } from "./r2";
export { s3Storage, s3ConfigFromEnv, type S3Config } from "./s3";
export { gcsStorage, gcsConfigFromEnv, type GcsConfig } from "./gcs";
export { fsStorage } from "./fs";
export { mockStorage } from "./mock";
export {
  availableProviders,
  selectStorage,
  isStorageProvider,
  type StorageProvider,
} from "./provider";
// blobStorage NO se exporta acá: vive en "@dentvega/miniapp-storage/vercel-blob"
// porque @vercel/blob es un peer opcional.
