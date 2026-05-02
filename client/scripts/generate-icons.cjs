const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '../public/icons/icon.svg');
const out = path.join(__dirname, '../public/icons');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-167.png', size: 167 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-120.png', size: 120 },
];

async function generate() {
  const svg = fs.readFileSync(src);
  for (const { name, size } of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(out, name));
    console.log(`✅ ${name} (${size}x${size})`);
  }
}

generate().catch(console.error);
