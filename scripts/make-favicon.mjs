// Generates the Kallmania favicon set from the in-app brand mark
// (src/components/kallmania/shell.tsx -> BrandMark):
//   rounded square, warm orange gradient (#f0a267 -> #e8873a -> #d97a35),
//   chunky "K" glyph in #1a120b, subtle top sheen.
// Outputs into src/app/ (Next.js App Router auto-serves these):
//   icon.png (512), apple-icon.png (180), icon.svg, favicon.ico (16/32/48)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");

// K drawn as strokes (font-independent, chunky for 16px legibility).
const svg = (size) => {
  const s = size / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0a267"/>
      <stop offset="46%" stop-color="#e8873a"/>
      <stop offset="100%" stop-color="#d97a35"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="28%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="140" fill="url(#g)"/>
  <rect width="512" height="512" rx="140" fill="url(#sheen)"/>
  <g stroke="#1a120b" stroke-width="84" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="164" y1="142" x2="164" y2="370"/>
    <polyline points="344,142 200,256 344,370"/>
  </g>
</svg>`;
};

// Minimal ICO builder that embeds PNG-compressed entries (supported by all modern browsers)
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4); // image count
  const entries = Buffer.alloc(16 * count);
  const images = [];
  let offset = 6 + 16 * count;
  pngBuffers.forEach(({ size, buf }, i) => {
    const e = i * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, e + 0); // width (0 = 256)
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    entries.writeUInt8(0, e + 2); // palette
    entries.writeUInt8(0, e + 3); // reserved
    entries.writeUInt16LE(1, e + 4); // planes
    entries.writeUInt16LE(32, e + 6); // bit depth
    entries.writeUInt32LE(buf.length, e + 8); // data size
    entries.writeUInt32LE(offset, e + 12); // data offset
    offset += buf.length;
    images.push(buf);
  });
  return Buffer.concat([header, entries, ...images]);
}

mkdirSync(APP, { recursive: true });

const base = Buffer.from(svg(512));
writeFileSync(join(APP, "icon.svg"), svg(512), "utf8");
await sharp(base).png().toFile(join(APP, "icon.png"));
await sharp(base).resize(180, 180).png().toFile(join(APP, "apple-icon.png"));

const icoSizes = [16, 32, 48];
const icoParts = [];
for (const size of icoSizes) {
  const buf = await sharp(base).resize(size, size).png().toBuffer();
  icoParts.push({ size, buf });
}
writeFileSync(join(APP, "favicon.ico"), buildIco(icoParts));

console.log("favicon set written to src/app/: icon.svg icon.png apple-icon.png favicon.ico");
