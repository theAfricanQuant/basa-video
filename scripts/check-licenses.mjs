#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const allowed = new Set(["MIT", "ISC", "Apache-2.0", "BSD-3-Clause"]);
const seen = new Set();
const failures = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name.startsWith("@")) {
      await scan(path);
      continue;
    }
    if (!entry.isDirectory()) continue;
    const manifest = join(path, "package.json");
    try {
      const pkg = JSON.parse(await readFile(manifest, "utf8"));
      const key = `${pkg.name}@${pkg.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const license = typeof pkg.license === "string" ? pkg.license : "UNKNOWN";
      if (!allowed.has(license)) failures.push({ package: key, license });
    } catch {
      // Not a package directory.
    }
  }
}

await scan(fileURLToPath(new URL("../node_modules", import.meta.url)));
if (failures.length) {
  console.error("Dependency license review required:");
  console.table(failures);
  process.exit(1);
}
console.log(`License allowlist passed for ${seen.size} installed packages.`);
