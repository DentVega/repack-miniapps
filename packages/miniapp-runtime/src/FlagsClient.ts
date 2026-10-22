import type { FlagChannel } from "@dentvega/miniapp-contract";

export interface FlagsResult {
  readonly available: boolean;
  readonly channel: FlagChannel;
}

export interface FlagsClient {
  evaluate(id: string, subject: string | null): Promise<FlagsResult>;
}

/** Si los flags fallan o tardan, la miniapp sigue disponible por la copia embebida. */
export const FLAGS_FALLBACK: FlagsResult = { available: true, channel: "lib" };

const CHANNELS: ReadonlySet<string> = new Set(["stable", "candidate", "lib"]);

function isFlagsResult(v: unknown): v is FlagsResult {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.available === "boolean" && typeof r.channel === "string" && CHANNELS.has(r.channel);
}

/** Cliente HTTP de `GET /api/flags`. Nunca lanza: ante error, 5xx, cuerpo inválido o timeout devuelve FLAGS_FALLBACK. */
export function httpFlagsClient(
  baseUrl: string,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): FlagsClient {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    async evaluate(id, subject) {
      // Query armada a mano: la URL de React Native no implementa URLSearchParams.set.
      const params = [`id=${encodeURIComponent(id)}`];
      if (subject !== null) params.push(`subject=${encodeURIComponent(subject)}`);
      const url = `${baseUrl.replace(/\/+$/, "")}/api/flags?${params.join("&")}`;

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<FlagsResult>((resolve) => {
        timer = setTimeout(() => resolve(FLAGS_FALLBACK), timeoutMs);
      });
      const request = (async (): Promise<FlagsResult> => {
        try {
          const res = await fetchImpl(url);
          if (!res.ok) return FLAGS_FALLBACK;
          const body: unknown = await res.json();
          return isFlagsResult(body) ? { available: body.available, channel: body.channel } : FLAGS_FALLBACK;
        } catch {
          return FLAGS_FALLBACK;
        }
      })();
      try {
        return await Promise.race([request, timeout]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
  };
}
