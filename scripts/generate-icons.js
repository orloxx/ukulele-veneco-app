const fs = require("node:fs");
const path = require("node:path");

// Simple SVG icon generator
function generateSVGIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">🎸</text>
</svg>`;
}

// Create icons directory
const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log("Generating placeholder PWA icons...");

sizes.forEach((size) => {
  const svgContent = generateSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svgContent);
  console.log(`✓ Generated ${filename}`);
});

console.log("\n✨ Done! SVG icons created in public/icons/");
console.log(
  "\nNote: These are placeholder icons with a gradient background and emoji.",
);
console.log(
  "For production, replace with proper PNG icons extracted from your Lottie animation.",
);
console.log("\nTo create proper icons:");
console.log("1. Run: pnpm run dev --webpack");
console.log("2. Screenshot the ukulele animation at http://localhost:3000");
console.log("3. Use https://realfavicongenerator.net/ to generate all sizes");
console.log(
  "4. Replace the SVG files in public/icons/ with the generated PNGs",
);
