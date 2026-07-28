/**
 * Genera PNG PWA da client/assets/icon.svg
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVG = path.join(ROOT, 'client', 'assets', 'icon.svg');
const OUT = path.join(ROOT, 'client', 'assets', 'icons');

const SIZES = [
  { name: 'icon-180.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const svg = await fs.readFile(SVG);
  for (const { name, size } of SIZES) {
    await sharp(svg).resize(size, size).png().toFile(path.join(OUT, name));
    console.log(`Scritto ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
