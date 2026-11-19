// Vice Cover Studio — entrypoint for gta6-cover-art-01 (Node 22, standard
// library only). The app is plain static files under app/ (index.html plus
// its ES modules, sample photos, nothing fetched over the network), and this
// program hands it in: it copies app/ and screenshots/ from beside this file
// into the output directory and writes dossier.json there with the vendored
// make.fun library, so the judge can read the app's source outline and the
// screenshots. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.)
// Try the app itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, so a bad hand-in fails here instead of at the scorer:
// at most 4 screenshots of 256 KiB each; app/ at most 993 files, 48 MiB in
// all, and no path longer than 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function fail(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

function countEntries(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += 1;
    if (entry.isDirectory()) total += countEntries(join(dir, entry.name));
  }
  return total;
}

const appDir = join(repoRoot, 'app');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (countEntries(appDir) > DOSSIER_LIMITS.app_max_files) {
  fail('app/ holds more than 993 files and directories');
}

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}
const shotFiles = readdirSync(join(outputDir, 'screenshots')).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}
for (const name of shotFiles) {
  const bytes = statSync(join(outputDir, 'screenshots', name)).size;
  if (bytes > DOSSIER_LIMITS.screenshots.max_bytes) {
    fail(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

const dossier = buildDossier(outputDir, DOSSIER_LIMITS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
if (dossierBytes > 1572864) fail(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
console.log(
  `wrote ${outputDir} with app/, ${shotFiles.length} screenshots and dossier.json (${dossierBytes} bytes)`,
);
