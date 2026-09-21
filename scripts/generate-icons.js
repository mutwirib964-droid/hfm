import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');

// High resolution VTM Markets SVG with rich dark background and metallic gradients
const vtmSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="110" fill="#0B0E14" />
  <defs>
    <linearGradient id="vtm-bg-glow" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#1E232E" />
      <stop offset="100%" stopColor="#0B0E14" />
    </linearGradient>
    <linearGradient id="vtm-red" x1="128" y1="64" x2="384" y2="448" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#FF3352" />
      <stop offset="50%" stopColor="#E51937" />
      <stop offset="100%" stopColor="#A80018" />
    </linearGradient>
    <linearGradient id="vtm-white" x1="48" y1="64" x2="176" y2="448" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="100%" stopColor="#94A3B8" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#vtm-bg-glow)" />

  <!-- M Outer Pillars -->
  <path d="M 52 104 L 112 64 L 144 136 L 100 424 L 44 424 L 52 104 Z" fill="url(#vtm-white)" />
  <path d="M 460 104 L 400 64 L 368 136 L 412 424 L 468 424 L 460 104 Z" fill="url(#vtm-white)" />

  <!-- V Central Chevron -->
  <path d="M 128 164 L 180 164 L 256 352 L 256 444 L 128 164 Z" fill="url(#vtm-red)" />
  <path d="M 384 164 L 332 164 L 256 352 L 256 444 L 384 164 Z" fill="#B8071E" />

  <!-- T Keystone (Crossbar + Stem) -->
  <path d="M 160 68 H 352 L 372 124 H 140 L 160 68 Z" fill="url(#vtm-red)" />
  <path d="M 228 124 H 284 V 260 L 256 296 L 228 260 V 124 Z" fill="url(#vtm-red)" />
</svg>`;

// Maskable version has extra 15% inner padding so it is safe when cropped into circles
const vtmMaskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#0B0E14" />
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <defs>
      <linearGradient id="m-vtm-red" x1="128" y1="64" x2="384" y2="448" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF3352" />
        <stop offset="50%" stopColor="#E51937" />
        <stop offset="100%" stopColor="#A80018" />
      </linearGradient>
      <linearGradient id="m-vtm-white" x1="48" y1="64" x2="176" y2="448" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
    </defs>

    <!-- M Outer Pillars -->
    <path d="M 52 104 L 112 64 L 144 136 L 100 424 L 44 424 L 52 104 Z" fill="url(#m-vtm-white)" />
    <path d="M 460 104 L 400 64 L 368 136 L 412 424 L 468 424 L 460 104 Z" fill="url(#m-vtm-white)" />

    <!-- V Central Chevron -->
    <path d="M 128 164 L 180 164 L 256 352 L 256 444 L 128 164 Z" fill="url(#m-vtm-red)" />
    <path d="M 384 164 L 332 164 L 256 352 L 256 444 L 384 164 Z" fill="#B8071E" />

    <!-- T Keystone (Crossbar + Stem) -->
    <path d="M 160 68 H 352 L 372 124 H 140 L 160 68 Z" fill="url(#m-vtm-red)" />
    <path d="M 228 124 H 284 V 260 L 256 296 L 228 260 V 124 Z" fill="url(#m-vtm-red)" />
  </g>
</svg>`;

async function run() {
  const svgBuffer = Buffer.from(vtmSvg);
  const maskableSvgBuffer = Buffer.from(vtmMaskableSvg);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 512x512 maskable
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // favicon.png 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('PWA icons successfully generated in /public!');
}

run().catch(console.error);
