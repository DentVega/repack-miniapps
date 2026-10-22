/** Persistencia del último manifiesto de control aceptado (JSON crudo). El host inyecta la suya (p. ej. MMKV). */
export interface ManifestStore {
  load(): Promise<string | null>;
  save(raw: string): Promise<void>;
}

/** Store en memoria: vale para tests y como default sin persistencia. */
export function memoryManifestStore(): ManifestStore {
  let raw: string | null = null;
  return {
    async load() {
      return raw;
    },
    async save(next) {
      raw = next;
    },
  };
}
