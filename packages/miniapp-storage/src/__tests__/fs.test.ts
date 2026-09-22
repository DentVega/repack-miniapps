import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fsStorage } from "../fs.js";
import { StorageError } from "../types.js";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(path.join(tmpdir(), "storage-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("fsStorage", () => {
  it("escribe los archivos bajo root/prefix y devuelve la baseUrl", async () => {
    const root = tmp();
    const res = await fsStorage(root, "http://localhost:3999/chunks").putMany("app/1.0.0", [
      { path: "app.bundle", data: new Uint8Array([1, 2, 3]) },
    ]);
    expect(res.baseUrl).toBe("http://localhost:3999/chunks/app/1.0.0");
    expect([...readFileSync(path.join(root, "app/1.0.0/app.bundle"))]).toEqual([1, 2, 3]);
  });

  it("crea subdirectorios anidados", async () => {
    const root = tmp();
    await fsStorage(root, "http://x").putMany("app/1.0.0", [
      { path: "ios/app.bundle", data: new Uint8Array([9]) },
    ]);
    expect(existsSync(path.join(root, "app/1.0.0/ios/app.bundle"))).toBe(true);
  });

  it("deletePrefix borra el árbol y no falla si no existe", async () => {
    const root = tmp();
    const s = fsStorage(root, "http://x");
    await s.putMany("app/1.0.0", [{ path: "a.bundle", data: new Uint8Array([1]) }]);
    await s.deletePrefix("app/1.0.0");
    expect(existsSync(path.join(root, "app/1.0.0"))).toBe(false);
    await expect(s.deletePrefix("no/existe")).resolves.toBeUndefined();
  });

  it("tira StorageError si no hay archivos", async () => {
    await expect(fsStorage(tmp(), "http://x").putMany("p", [])).rejects.toThrow(StorageError);
  });
});
