const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function writeImageMetadata(filePath, { title, description, author, copyright } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED.has(ext)) return;
  if (!title && !description && !author && !copyright) return;

  const ifd0 = {};

  // Standard EXIF (read by most tools)
  if (title || description) ifd0.ImageDescription = (title || description).slice(0, 255);
  if (author)    ifd0.Artist    = author.slice(0, 255);
  if (copyright) ifd0.Copyright = copyright.slice(0, 255);

  // Windows Explorer XP tags (Details tab: Title, Subject, Authors, Comments)
  if (title)       ifd0.XPTitle   = title.slice(0, 255);
  if (title)       ifd0.XPSubject = title.slice(0, 255);
  if (author)      ifd0.XPAuthor  = author.slice(0, 255);
  if (description) ifd0.XPComment = description.slice(0, 255);

  const buf = await sharp(filePath)
    .withExifMerge({ IFD0: ifd0 })
    .toBuffer();
  fs.writeFileSync(filePath, buf);
}

module.exports = { writeImageMetadata };
