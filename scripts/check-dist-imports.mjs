#!/usr/bin/env node
// Falla si un dist/*.js o dist/*.d.ts tiene imports/exports relativos sin extensión, o que
// apuntan a archivos inexistentes: ese es justo el escenario en el que tsc compila, los tests
// pasan, y el ESM publicado revienta al importarlo.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// from\s+       → `import X from "./y"`, `export { X } from "./y"`, `export * from "./y"`,
//                 `export type { X } from "./y"` (all share the `from "..."` tail).
// import\s*\(\s*→ dynamic `import("./y")`.
// import\s+["']→ bare side-effect import, `import "./y";` (no `from`, no bound identifier).
const RELATIVE = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+)["']/g;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js") || p.endsWith(".d.ts")) check(p);
  }
}

function check(file) {
  const src = readFileSync(file, "utf8");
  for (const [, spec] of src.matchAll(RELATIVE)) {
    if (!spec.endsWith(".js")) problems.push(`${file}: "${spec}" sin extensión .js`);
    else if (!existsSync(resolve(dirname(file), spec))) problems.push(`${file}: "${spec}" no existe`);
  }
}

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error("uso: check-dist-imports.mjs <dist-dir...>");
  process.exit(2);
}
for (const d of dirs) walk(d);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`ok: ${dirs.join(", ")}`);
