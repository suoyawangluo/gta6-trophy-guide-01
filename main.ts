// GTA 6 trophy guide entry (Node 22, standard library only): the guide is this
// directory's app/ folder — plain static files a browser opens at app/index.html
// (ES modules, CSS, no build step), offline: it loads nothing over the network,
// and its trophy list and guides are app/data/trophies.json. This program hands
// it in: it copies app/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads (the screenshots, the
// first load's files and bytes, and the source), with the vendored make.fun
// library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
// dossier.json to be byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

// Verify what was handed in: read the dossier back and count the output, so a
// broken copy or a missing screenshot fails loudly here instead of at the gate.
const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') throw new Error(`dossier schema is ${dossier.schema}, expected makefun/dossier/v1`);
if (typeof dossier.text !== 'string' || !dossier.text.startsWith('## Load')) throw new Error('dossier text does not start with the Load block');
if (!Array.isArray(dossier.images) || dossier.images.length < 3 || dossier.images.length > 4) throw new Error(`dossier holds ${dossier.images?.length ?? 0} images, expected 3-4`);
const dossierBytes = statSync(join(out, 'dossier.json')).size;
if (dossierBytes > 1572864) throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
const shotFiles = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
const appFiles = readdirSync(join(out, 'app'), { recursive: true });
const trophies = JSON.parse(readFileSync(join(out, 'app', 'data', 'trophies.json'), 'utf8')).trophies;
if (shotFiles.length < 3 || shotFiles.length > 4) throw new Error(`expected 3-4 screenshots, found ${shotFiles.length}`);
for (const f of shotFiles) {
  const size = statSync(join(out, 'screenshots', f)).size;
  if (size > 262144) throw new Error(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
}
if (trophies.length !== 55) throw new Error(`expected 55 trophies, found ${trophies.length}`);
if (trophies.some((t) => typeof t.guide !== 'string' || !t.guide.trim())) throw new Error('every trophy needs a non-empty guide');
console.log(`dossier ok: ${dossier.shots?.length ?? shotFiles.length} screenshots, ${appFiles.length} app entries, ${trophies.length} trophies with guides`);
console.log(`dossier.json is ${dossierBytes} bytes with ${dossier.images.length} images, cover ${dossier.images[0].name}`);
console.log(`output written to ${out}`);
