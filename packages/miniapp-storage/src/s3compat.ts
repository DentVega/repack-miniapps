import { AwsClient } from "aws4fetch";
import { StorageError, type ChunkStorage, type SignedFetch } from "./types.js";

export interface S3CompatConfig {
  /** URL base del bucket, ya resuelta (sin barra final). */
  readonly endpoint: string;
  /** "auto" para R2 y GCS; la región real para AWS. */
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** De dónde LEE el host. Puede ser otro host que el de escritura (R2: dominio público). */
  readonly publicBaseUrl: string;
  /**
   * Fuerza `content-length` explícito. R2 rechaza uploads chunked con HTTP 411, y el fetch
   * parcheado de Next puede convertir un buffer en stream. AWS y GCS no lo necesitan.
   */
  readonly pinContentLength?: boolean;
}

export function contentType(path: string): string {
  if (path.endsWith(".js") || path.endsWith(".bundle")) return "application/javascript";
  if (path.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

/** Fetch firmado con SigV4. Es lo que usan R2, AWS S3 y GCS (modo interoperabilidad). */
export function signedFetchFor(config: S3CompatConfig): SignedFetch {
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: config.region,
  });
  return async (url, init) => {
    const res = await aws.fetch(url, init as RequestInit);
    return { ok: res.ok, status: res.status, text: () => res.text() };
  };
}

/**
 * Motor S3-compatible. Las ESCRITURAS van firmadas al `endpoint`; las LECTURAS salen de
 * `publicBaseUrl` — dos hosts distintos, por eso putMany escribe en uno y devuelve el otro.
 * Idempotente (PUT sobreescribe).
 */
export function s3Compatible(config: S3CompatConfig, fetchImpl?: SignedFetch): ChunkStorage {
  const doFetch = fetchImpl ?? signedFetchFor(config);
  const base = config.endpoint.replace(/\/+$/, "");
  const publicBase = config.publicBaseUrl.replace(/\/+$/, "");
  return {
    async putMany(prefix, files): Promise<{ baseUrl: string }> {
      if (files.length === 0) throw new StorageError("no files to upload");
      try {
        for (const file of files) {
          const headers: Record<string, string> = { "content-type": contentType(file.path) };
          if (config.pinContentLength) {
            headers["content-length"] = String(file.data.byteLength);
          }
          const res = await doFetch(`${base}/${prefix}/${file.path}`, {
            method: "PUT",
            body: file.data,
            headers,
          });
          if (!res.ok) throw new StorageError(`S3 PUT failed: HTTP ${res.status}`);
        }
      } catch (err) {
        if (err instanceof StorageError) throw err;
        throw new StorageError(err instanceof Error ? err.message : "S3 upload failed");
      }
      return { baseUrl: `${publicBase}/${prefix}` };
    },
    async deletePrefix(prefix): Promise<void> {
      // ListObjectsV2 → DELETE por key. Best-effort: si el listado falla, no borramos nada.
      const listRes = await doFetch(
        `${base}?list-type=2&prefix=${encodeURIComponent(`${prefix}/`)}`,
        { method: "GET" },
      );
      if (!listRes.ok) return;
      const xml = await listRes.text();
      const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]!);
      for (const key of keys) {
        await doFetch(`${base}/${key}`, { method: "DELETE" });
      }
    },
  };
}
