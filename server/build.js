/**
 * Genera dist/worker.js incorporando status.js + shared.js.
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT, 'client');
const SW_PATH = path.join(CLIENT_DIR, 'sw.js');
const SW_HASH_FILES = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest'];
const TEMPLATE_PATH = path.join(__dirname, 'worker.template.js');
const STATUS_PATH = path.join(__dirname, 'status.js');
const SHARED_PATH = path.join(__dirname, 'shared.js');
const OUTPUT_PATH = path.join(ROOT, 'dist', 'worker.js');

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+/gm, '')
    .trim();
}

async function stampServiceWorker() {
  const hash = crypto.createHash('sha256');
  for (const name of SW_HASH_FILES) {
    try {
      hash.update(await fs.readFile(path.join(CLIENT_DIR, name)));
    } catch {
      // File opzionale assente.
    }
  }
  const version = `v-${hash.digest('hex').slice(0, 10)}`;

  const sw = await fs.readFile(SW_PATH, 'utf-8');
  const re = /const CACHE_VERSION = '[^']*';/;
  if (!re.test(sw)) {
    throw new Error("Riga `const CACHE_VERSION = '...';` non trovata in client/sw.js");
  }
  const updated = sw.replace(re, `const CACHE_VERSION = '${version}';`);
  if (updated !== sw) await fs.writeFile(SW_PATH, updated, 'utf-8');
  return version;
}

/** Copia `video/` → `client/video/` così Wrangler (assets = client) li serve a `/video/…`. */
async function syncSpellVideos() {
  const src = path.join(ROOT, 'video');
  const dest = path.join(CLIENT_DIR, 'video');
  await fs.rm(dest, { recursive: true, force: true });
  try {
    await fs.access(src);
  } catch {
    await fs.mkdir(dest, { recursive: true });
    return 0;
  }
  await fs.cp(src, dest, { recursive: true });
  const entries = await fs.readdir(dest);
  return entries.filter((n) => !n.startsWith('.')).length;
}

async function main() {
  const videoCount = await syncSpellVideos();
  const [template, statusSrc, shared] = await Promise.all([
    fs.readFile(TEMPLATE_PATH, 'utf-8'),
    fs.readFile(STATUS_PATH, 'utf-8'),
    fs.readFile(SHARED_PATH, 'utf-8'),
  ]);

  const dataBlock = [
    '// --- inlined from server/status.js ---',
    stripModuleSyntax(statusSrc),
    '',
    '// --- inlined from server/shared.js ---',
    stripModuleSyntax(shared),
    '',
  ].join('\n');

  if (!template.includes('/* __EMBED_DATA__ */')) {
    throw new Error('Placeholder /* __EMBED_DATA__ */ non trovato nel template');
  }

  const output = template.replace('/* __EMBED_DATA__ */', dataBlock);
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, output, 'utf-8');

  const swVersion = await stampServiceWorker();
  const stats = await fs.stat(OUTPUT_PATH);
  console.log(`Scritto ${path.relative(ROOT, OUTPUT_PATH)} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`Service worker CACHE_VERSION: ${swVersion}`);
  console.log(`Clip incantesimi sincronizzati in client/video/: ${videoCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
