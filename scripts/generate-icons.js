import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// High-definition modern vector logo with deep dynamic range, glowing ambient aura,
// metallic silver pillars, and electric crimson VTM chevron
const createMasterSvg = (isMaskable = false) => {
  const scale = isMaskable ? 0.72 : 0.88;
  const translate = isMaskable ? 72 : 31;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0F1420" />
      <stop offset="50%" stop-color="#090C13" />
      <stop offset="100%" stop-color="#040609" />
    </linearGradient>

    <!-- Outer Rim Stroke Gradient -->
    <linearGradient id="rim-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.6" />
      <stop offset="35%" stop-color="#E51937" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#1E293B" stop-opacity="0.3" />
    </linearGradient>

    <!-- Ambient Radial Glow behind the emblem -->
    <radialGradient id="center-glow" cx="256" cy="256" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E51937" stop-opacity="0.32" />
      <stop offset="55%" stop-color="#3B82F6" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Crimson VTM Red Gradient -->
    <linearGradient id="vtm-crimson" x1="120" y1="90" x2="380" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF4D6A" />
      <stop offset="35%" stop-color="#E51937" />
      <stop offset="100%" stop-color="#9B0017" />
    </linearGradient>

    <linearGradient id="vtm-crimson-dark" x1="256" y1="120" x2="420" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E51937" />
      <stop offset="100%" stop-color="#730010" />
    </linearGradient>

    <!-- Silver Platinum Metallic Gradient for Outer Pillars -->
    <linearGradient id="vtm-silver-left" x1="40" y1="80" x2="160" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="40%" stop-color="#E2E8F0" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>

    <linearGradient id="vtm-silver-right" x1="470" y1="80" x2="350" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="40%" stop-color="#E2E8F0" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>

    <!-- Subtle Drop Shadow Filter -->
    <filter id="emblem-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000000" flood-opacity="0.75" />
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#E51937" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Base Rounded Container -->
  ${
    isMaskable
      ? `<rect width="512" height="512" fill="url(#bg-grad)" />`
      : `<rect width="504" height="504" x="4" y="4" rx="112" fill="url(#bg-grad)" stroke="url(#rim-grad)" stroke-width="6" />`
  }

  <!-- Ambient Backlight -->
  <circle cx="256" cy="256" r="220" fill="url(#center-glow)" />

  <!-- Grid lines subtle financial texture -->
  <g opacity="0.08" stroke="#FFFFFF" stroke-width="1.5">
    <line x1="80" y1="160" x2="432" y2="160" />
    <line x1="80" y1="256" x2="432" y2="256" />
    <line x1="80" y1="352" x2="432" y2="352" />
    <line x1="160" y1="80" x2="160" y2="432" />
    <line x1="256" y1="80" x2="256" y2="432" />
    <line x1="352" y1="80" x2="352" y2="432" />
  </g>

  <!-- Scaled & Centered VTM Emblem -->
  <g transform="translate(${translate}, ${translate}) scale(${scale})" filter="url(#emblem-shadow)">
    <!-- Outer "M" Left Wing / Pillar -->
    <path
      d="M 52 104 L 112 64 L 144 136 L 100 424 L 44 424 L 52 104 Z"
      fill="url(#vtm-silver-left)"
    />
    <!-- Outer "M" Right Wing / Pillar -->
    <path
      d="M 460 104 L 400 64 L 368 136 L 412 424 L 468 424 L 460 104 Z"
      fill="url(#vtm-silver-right)"
    />

    <!-- Center "V" Chevron Left Arm -->
    <path
      d="M 128 164 L 180 164 L 256 352 L 256 444 L 128 164 Z"
      fill="url(#vtm-crimson)"
    />
    <!-- Center "V" Chevron Right Arm (Darker Facet for 3D depth) -->
    <path
      d="M 384 164 L 332 164 L 256 352 L 256 444 L 384 164 Z"
      fill="url(#vtm-crimson-dark)"
    />

    <!-- "T" Keystone Crossbar & Cap -->
    <path
      d="M 160 68 H 352 L 372 124 H 140 L 160 68 Z"
      fill="url(#vtm-crimson)"
    />
    <!-- "T" Center Stem -->
    <path
      d="M 228 124 H 284 V 260 L 256 296 L 228 260 V 124 Z"
      fill="url(#vtm-crimson)"
    />

    <!-- Specular Highlight Sheen on Keystone -->
    <polygon points="172,74 340,74 332,86 180,86" fill="#FFFFFF" opacity="0.35" />

    <!-- Center Pivot Diamond Accents -->
    <polygon points="256,336 268,352 256,368 244,352" fill="#FFFFFF" opacity="0.9" />
  </g>
</svg>`;
};

async function generateAllIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');

  const standardSvg = createMasterSvg(false);
  const maskableSvg = createMasterSvg(true);

  // Write master SVGs
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg);

  // Render 512x512 standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Render 192x192 standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Render 512x512 maskable (with safe zone margins for Android launchers)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Render 180x180 Apple Touch Icon
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Render 64x64 Favicon PNG
  await sharp(Buffer.from(standardSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('✅ Successfully generated high-contrast, premium 3D PWA and launcher icons!');
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
