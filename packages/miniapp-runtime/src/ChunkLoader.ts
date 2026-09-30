import type { ComponentType } from "react";
import type { MiniappEntryProps, ResolveResponse } from "@dentvega/miniapp-contract";

export type EntryComponent = ComponentType<MiniappEntryProps>;

/**
 * Downloads and returns a miniapp's exposed `./Entry` component.
 * The concrete Re.Pack/Module-Federation adapter lives in the host app
 * (ADR-009); this interface keeps the loader logic testable via a mock.
 */
export interface ChunkLoader {
  load(resolved: ResolveResponse): Promise<EntryComponent>;
}
