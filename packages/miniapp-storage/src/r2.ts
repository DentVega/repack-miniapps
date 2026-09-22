import { s3Compatible } from "./s3compat.js";
import type { ChunkStorage, SignedFetch } from "./types.js";

export interface R2Config {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  readonly publicBaseUrl: string;
}

/** Config de R2 desde un env; null si falta alguna de las 5 vars. */
export function r2ConfigFromEnv(env: Record<string, string | undefined>): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

/** Cloudflare R2: S3-compatible, región "auto", y necesita content-length explícito. */
export function r2Storage(config: R2Config, fetchImpl?: SignedFetch): ChunkStorage {
  return s3Compatible(
    {
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`,
      region: "auto",
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      publicBaseUrl: config.publicBaseUrl,
      pinContentLength: true,
    },
    fetchImpl,
  );
}
