// Vice Cover Studio — entry program (Node 22 stdlib only).
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with the vendored make.fun library. Any cap violation or
// missing input fails loudly instead of writing a partial entry.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const root = dirname(fileURLToPath(import.meta.url));
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');

if (!existsSync(appDir) || !statSync(appDir).isDirectory()) fail('no app/ directory');
if (!existsSync(join(appDir, 'index.html'))) fail('no app/index.html');
if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('no screenshots/ directory');

const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
if (shots.length === 0) fail('screenshots/ is empty');
if (shots.length > CAPS.screenshots.max) {
  fail('screenshots/: ' + shots.length + ' files, over the max of ' + CAPS.screenshots.max);
}
for (const name of shots) {
  if (!/\.(jpe?g|png|webp)$/i.test(name)) fail('screenshots/' + name + ': not an image file');
  const file = join(shotsDir, name);
  if (!statSync(file).isFile()) fail('screenshots/' + name + ' is not a file');
  const bytes = statSync(file).size;
  if (bytes > CAPS.screenshots.max_bytes) {
    fail('screenshots/' + name + ': ' + bytes + ' bytes, over the ' + CAPS.screenshots.max_bytes + ' cap');
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

let dossier: Uint8Array;
try {
  dossier = buildDossier(outDir, CAPS);
} catch (err) {
  fail('buildDossier failed: ' + (err as Error).message);
}
if (dossier.length > 4 * 1024 * 1024) fail('dossier.json: ' + dossier.length + ' bytes, over the 4 MiB cap');
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('wrote ' + outDir + '/dossier.json (' + dossier.length + ' bytes), ' + shots.length + ' screenshots');
