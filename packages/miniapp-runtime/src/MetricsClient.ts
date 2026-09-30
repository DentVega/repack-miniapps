/**
 * Telemetría de runtime que el host reporta a Backstage (POST /api/metrics).
 * Se define acá, local a este paquete, para no tener que republicar
 * @dentvega/miniapp-contract por un único tipo de telemetría.
 */
export type MetricEvent =
  | { readonly type: "mount"; readonly id: string; readonly version?: string }
  | { readonly type: "fallback"; readonly id: string; readonly reason: string };

export interface MetricsClient {
  /** Reporta un evento. NO es async ni tira: las métricas nunca frenan/rompen la app. */
  track(event: MetricEvent): void;
}

/** POST fire-and-forget a Backstage; los errores se tragan (best-effort). */
export function httpMetricsClient(baseUrl: string): MetricsClient {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/metrics`;
  return {
    track(event: MetricEvent): void {
      try {
        void fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ events: [event] }),
        }).catch(() => {
          // reject async: perder una métrica no es un error del host.
        });
      } catch {
        // throw sync (URL inválida, etc.): best-effort, no rompe el mount.
      }
    },
  };
}

/** No-op (tests / cuando las métricas están apagadas). */
export const noopMetricsClient: MetricsClient = { track() {} };
