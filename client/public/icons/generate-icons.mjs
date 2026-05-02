import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const svgString = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#f0f4ff"/>
  <path d="M80 148 Q80 68 160 68 L352 68 Q432 68 432 148 L432 308 Q432 388 352 388 L296 388 L256 452 L216 388 L160 388 Q80 388 80 308 Z" fill="#0055A4"/>
  <rect x="148" y="208" width="32" height="64" rx="16" fill="white"/>
  <rect x="204" y="176" width="32" height="128" rx="16" fill="white"/>
  <rect x="260" y="192" width="32" height="96" rx="16" fill="white"/>
  <rect x="316" y="208" width="32" height="64" rx="16" fill="white"/>
</svg>`;

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-120.png', size: 120 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-167.png', size: 167 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svgString))
    .resize(size, size)
    .png()
    .toFile(join(__dirname, name));
  console.log(`Generated ${name}`);
}
