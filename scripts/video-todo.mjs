/**
 * Elenca le clip incantesimo mancanti in video/ e stampa i prompt pronti.
 *
 *   node scripts/video-todo.mjs            → cosa manca
 *   node scripts/video-todo.mjs --prompts  → prompt completi (prefisso + spell)
 *   node scripts/video-todo.mjs --json     → output per script
 *   node scripts/video-todo.mjs --all      → anche le clip già presenti
 *
 * I nomi file sono quelli che il client si aspetta (client/app.js →
 * spellVideoSlug): basta salvare ogni clip come `video/<slug>.mp4`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROMPTS = path.join(ROOT, 'docs', 'SPELL_VIDEO_PROMPTS.md');
const APP = path.join(ROOT, 'client', 'app.js');
const VIDEO_DIR = path.join(ROOT, 'video');

const slugify = (title) => title.toLowerCase().trim().replace(/\s+/g, '-');

/** Slug attesi dal client: SPELL_VIDEO_TITLE + i due elementali. */
async function requiredSlugs() {
  const src = await fs.readFile(APP, 'utf-8');
  const block = src.match(/const SPELL_VIDEO_TITLE = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error('SPELL_VIDEO_TITLE non trovato in client/app.js');

  const bySlug = new Map();
  const add = (slug, spellId) => {
    if (!bySlug.has(slug)) bySlug.set(slug, { slug, spells: [] });
    bySlug.get(slug).spells.push(spellId);
  };
  for (const m of block[1].matchAll(/^\s*(\w+):\s*'([^']+)'/gm)) add(slugify(m[2]), m[1]);
  add('elemental-fire', 'summonElemental (fuoco)');
  add('elemental-ice', 'summonElemental (ghiaccio)');
  return bySlug;
}

/** Prompt del documento: titolo della sezione → testo del blocco ```. */
async function promptsBySlug() {
  const md = await fs.readFile(PROMPTS, 'utf-8');
  const prefix = md.match(/## Prefisso comune[^\n]*\n[\s\S]*?```\n([\s\S]*?)```/)?.[1].trim() || '';

  const out = new Map();
  // «### Titolo — gesti» seguito dal primo blocco di codice.
  // Il separatore è la lineetta lunga: i trattini fanno parte del titolo
  // («Counter-spell», «Anti-spell»).
  for (const m of md.matchAll(/^### ([^\n]+?)(?:\s+—\s*[^\n]*)?\n+```\n([\s\S]*?)```/gm)) {
    out.set(slugify(m[1]), m[2].trim());
  }
  return { prefix, prompts: out };
}

async function existingSlugs() {
  try {
    const files = await fs.readdir(VIDEO_DIR);
    return new Set(files.filter((f) => /\.(mp4|webm|mov)$/i.test(f)).map((f) => f.replace(/\.[^.]+$/, '')));
  } catch {
    return new Set();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const [required, { prefix, prompts }, have] = await Promise.all([
    requiredSlugs(), promptsBySlug(), existingSlugs(),
  ]);

  const rows = [...required.values()].map((r) => ({
    ...r,
    file: `video/${r.slug}.mp4`,
    present: have.has(r.slug),
    prompt: prompts.get(r.slug) || null,
  })).sort((a, b) => a.slug.localeCompare(b.slug));

  const wanted = args.has('--all') ? rows : rows.filter((r) => !r.present);

  if (args.has('--json')) {
    console.log(JSON.stringify({ prefix, clips: wanted }, null, 2));
    return;
  }

  const missing = rows.filter((r) => !r.present);
  const senzaPrompt = rows.filter((r) => !r.prompt);
  const orfani = [...have].filter((h) => !required.has(h));

  if (args.has('--prompts')) {
    for (const r of wanted) {
      console.log(`\n${'='.repeat(72)}\n${r.file}   (${r.spells.join(', ')})\n${'='.repeat(72)}\n`);
      console.log(r.prompt ? `${prefix}\n\n${r.prompt}` : '⚠️  nessun prompt in docs/SPELL_VIDEO_PROMPTS.md');
    }
  } else {
    console.log(`Clip richieste: ${rows.length} · presenti: ${rows.length - missing.length} · mancanti: ${missing.length}\n`);
    for (const r of wanted) {
      console.log(`${r.present ? '✓' : ' '} ${r.file.padEnd(32)} ${r.prompt ? '' : '⚠️ prompt mancante  '}${r.spells.join(', ')}`);
    }
    if (!args.has('--all')) console.log('\nPrompt pronti da incollare: node scripts/video-todo.mjs --prompts');
  }

  if (senzaPrompt.length) {
    console.log(`\n⚠️  Senza prompt nel documento: ${senzaPrompt.map((r) => r.slug).join(', ')}`);
  }
  if (orfani.length) {
    console.log(`\n⚠️  File in video/ che il client non userà mai: ${orfani.join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
