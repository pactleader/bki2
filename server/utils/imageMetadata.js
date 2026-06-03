const sharp = require('sharp');
const path  = require('path');

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function writeImageMetadata(filePath, { title, description, author, copyright } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED.has(ext)) return; // skip SVG, GIF

  if (!title && !description && !author && !copyright) return;

  // Build EXIF IFD0 fields
  const ifd0 = {};
  if (title || description) ifd0.ImageDescription = (title || description).slice(0, 255);
  if (author)    ifd0.Artist    = author.slice(0, 255);
  if (copyright) ifd0.Copyright = copyright.slice(0, 255);

  // Sharp expects the exif buffer to be a raw IFD0-encoded blob.
  // The simplest cross-platform way is to re-process through sharp with .withExifMerge()
  // which accepts a plain object of IFD0 string values.
  await sharp(filePath)
    .withExifMerge({ IFD0: ifd0 })
    .toBuffer()
    .then(buf => require('fs').writeFileSync(filePath, buf));
}

module.exports = { writeImageMetadata };
