/**
 * Converte/ridimensiona img/* → client/img/*.jpg (512×512).
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'img');
const OUT = path.join(ROOT, 'client', 'img');

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const files = (await fs.readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) throw new Error(`Nessuna immagine in ${SRC}`);

  for (const f of files) {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    const out = path.join(OUT, `${base}.jpg`);
    await sharp(path.join(SRC, f))
      .rotate()
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(out);
    const st = await fs.stat(out);
    console.log(`${f} → client/img/${base}.jpg (${Math.round(st.size / 1024)}KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
