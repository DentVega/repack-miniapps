import { describe, expect, it } from "vitest";
import { StorageError } from "../types.js";

describe("StorageError", () => {
  it("lleva code STORAGE_ERROR y el mensaje", () => {
    const err = new StorageError("boom");
    expect(err.code).toBe("STORAGE_ERROR");
    expect(err.message).toBe("boom");
    expect(err.name).toBe("StorageError");
    expect(err).toBeInstanceOf(Error);
  });
});
