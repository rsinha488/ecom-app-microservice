/**
 * Generate PNG and ICO icons from SVG source
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SVG_SOURCE = path.join(PUBLIC_DIR, 'icon.svg');

async function generateIcons() {
  try {
    console.log('🎨 Generating icons from SVG...');

    // Check if SVG source exists
    if (!fs.existsSync(SVG_SOURCE)) {
      console.error('❌ Source SVG not found:', SVG_SOURCE);
      process.exit(1);
    }

    const svgBuffer = fs.readFileSync(SVG_SOURCE);

    // Generate 192x192 PNG
    console.log('  - Generating icon-192x192.png...');
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'icon-192x192.png'));

    // Generate 512x512 PNG
    console.log('  - Generating icon-512x512.png...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'icon-512x512.png'));

    // Generate Apple Touch Icon (180x180)
    console.log('  - Generating apple-touch-icon.png...');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

    // Generate favicon (32x32)
    console.log('  - Generating favicon-32x32.png...');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));

    // Generate favicon (16x16)
    console.log('  - Generating favicon-16x16.png...');
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));

    // For .ico file, we'll create a simple redirect by copying the 32x32 version
    // Note: .ico files need special handling, but browsers accept PNG nowadays
    console.log('  - Generating favicon.ico (as PNG)...');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));

    console.log('✅ All icons generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - icon-192x192.png');
    console.log('  - icon-512x512.png');
    console.log('  - apple-touch-icon.png');
    console.log('  - favicon-32x32.png');
    console.log('  - favicon-16x16.png');
    console.log('  - favicon.ico');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
