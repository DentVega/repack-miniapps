import { memoryManifestStore } from "../manifestStore.js";

describe("memoryManifestStore", () => {
  it("arranca vacío y devuelve lo último guardado", async () => {
    const s = memoryManifestStore();
    expect(await s.load()).toBeNull();
    await s.save("a");
    await s.save("b");
    expect(await s.load()).toBe("b");
  });
});
