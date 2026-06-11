// Vendors the SplendidGrandPiano ogg samples into public/samples/ so the app
// serves its own audio (no runtime dependency on smplr's CDN). Runs on prebuild
// (see package.json) and is idempotent: a `.complete` marker short-circuits
// re-runs, so repeat builds and offline dev don't re-hit the network.
//
// Source: github.com/smpldsnds/sfzinstruments-splendid-grand-piano (the host
// smplr's SplendidGrandPiano uses by default). Sample names contain '#' (e.g.
// "FF A#2"); a '#' in a static URL path is a fragment delimiter that some hosts
// (incl. vite preview) mishandle, breaking every black-key sample. So we save
// files with '#' replaced by 's' ("FF As2.ogg") and rewrite the request in a
// custom smplr storage (see src/play/useChordPiano.ts) - host-agnostic.
//
// public/samples/ is gitignored. To keep the repo free of a build-time network
// dependency entirely, you can instead commit the files (drop the gitignore
// line and `git add public/samples`).

import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://smpldsnds.github.io/sfzinstruments-splendid-grand-piano/samples";
const FORMAT = "ogg"; // smplr prefers ogg; halves the footprint vs shipping m4a too
const CONCURRENCY = 8;
const RETRIES = 3;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "samples");
const marker = path.join(outDir, ".complete");

// '#' is unsafe in a static URL path; store as 's' and rewrite at load time.
const safeName = (name) => name.replace(/#/g, "s");

async function fetchBuffer(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

async function run() {
  if (existsSync(marker)) {
    console.log("[samples] already vendored (.complete present) - skipping");
    return;
  }
  await mkdir(outDir, { recursive: true });

  console.log("[samples] fetching manifest…".replace("…", "..."));
  const names = JSON.parse(
    await (await fetch(`${BASE}/files.json`)).text(),
  );
  if (!Array.isArray(names) || names.length === 0) throw new Error("empty/invalid files.json");

  // Skip files already on disk so partial runs resume cheaply.
  const present = new Set(
    existsSync(outDir) ? (await readdir(outDir)).filter((f) => f.endsWith(`.${FORMAT}`)) : [],
  );
  const todo = names.filter((n) => !present.has(`${safeName(n)}.${FORMAT}`));
  console.log(`[samples] ${names.length} samples, ${todo.length} to download`);

  let done = 0;
  const queue = [...todo];
  async function worker() {
    while (queue.length) {
      const name = queue.shift();
      const buf = await fetchBuffer(`${BASE}/${encodeURIComponent(name)}.${FORMAT}`);
      await writeFile(path.join(outDir, `${safeName(name)}.${FORMAT}`), buf);
      done++;
      if (done % 40 === 0 || done === todo.length) console.log(`[samples] ${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Sanity-check the byte total so a truncated set fails the build loudly.
  const files = (await readdir(outDir)).filter((f) => f.endsWith(`.${FORMAT}`));
  if (files.length < names.length) throw new Error(`only ${files.length}/${names.length} samples written`);
  let bytes = 0;
  for (const f of files) bytes += (await stat(path.join(outDir, f))).size;
  await writeFile(marker, `${files.length} ${FORMAT} files, ${(bytes / 1e6).toFixed(1)} MB\n`);
  console.log(`[samples] done: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB`);
}

run().catch((err) => {
  console.error("[samples] FAILED:", err.message);
  process.exit(1);
});
