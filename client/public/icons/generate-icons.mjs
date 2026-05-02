// Regenerates all PWA PNG icons from the speech-bubble + sound-bars logo.
// Run from the client directory: node public/icons/generate-icons.mjs
//
// All shape coordinates are pre-computed in the outer 512x512 space
// (logo viewBox 0-80 scaled ×4, offset 96px) to avoid SVG gradient
// coordinate-system ambiguity across renderers.

import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 512×512 master SVG — background + logo in a single coordinate system.
// Logo area: 320×320 centred in 512×512 canvas (offset=96, scale=4).
// Gradient endpoints map the original x1=0,y1=80 → (96,416)
// and x2=80,y2=0 → (416,96) in outer coords.
const MASTER_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#0a0a0a"/>
  <defs>
    <linearGradient id="sg" x1="96" y1="416" x2="416" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#F58529"/>
      <stop offset="25%"  stop-color="#DD2A7B"/>
      <stop offset="75%"  stop-color="#8134AF"/>
      <stop offset="100%" stop-color="#515BD4"/>
    </linearGradient>
  </defs>
  <!-- Speech bubble (original path scaled ×4 + offset 96) -->
  <path d="M 136 168 Q 136 128 176 128 L 336 128 Q 376 128 376 168 L 376 280 Q 376 320 336 320 L 288 320 L 256 368 L 224 320 L 176 320 Q 136 320 136 280 Z"
        fill="url(#sg)"/>
  <!-- Sound bars (original rects scaled ×4 + offset 96) -->
  <rect x="184" y="216" width="20" height="40"  rx="10" fill="white" opacity="0.95"/>
  <rect x="220" y="192" width="20" height="88"  rx="10" fill="white" opacity="0.95"/>
  <rect x="256" y="204" width="20" height="64"  rx="10" fill="white" opacity="0.95"/>
  <rect x="292" y="216" width="20" height="40"  rx="10" fill="white" opacity="0.95"/>
</svg>`;

const SIZES = [
  { file: 'icon-512.png',          size: 512 },
  { file: 'icon-192.png',          size: 192 },
  { file: 'apple-touch-icon.png',  size: 180 },
  { file: 'icon-167.png',          size: 167 },
  { file: 'icon-152.png',          size: 152 },
  { file: 'icon-120.png',          size: 120 },
];

for (const { file, size } of SIZES) {
  await sharp(Buffer.from(MASTER_SVG), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(__dirname, file));
  console.log(`✓ ${file} (${size}×${size})`);
}
