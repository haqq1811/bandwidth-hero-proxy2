const sharp = require("sharp");

// WebP encoder effort: 0 (fastest) to 6 (smallest). 2 is noticeably faster than
// Sharp's default of 4 for only slightly larger files.
const WEBP_EFFORT = 2;

// Re-encodes an image as low-quality WebP or JPEG. Throws if Sharp can't decode it.
async function compress(input, { useWebp, grayscale, quality }) {
  const format = useWebp ? "webp" : "jpeg";

  // Metadata is stripped on output, so apply the EXIF orientation first.
  let pipeline = sharp(input).rotate();

  // JPEG has no alpha channel; without this, transparent areas turn black.
  if (!useWebp) pipeline = pipeline.flatten({ background: "#ffffff" });

  // Single-channel output keeps grayscale JPEGs smaller.
  if (grayscale) pipeline = pipeline.grayscale().toColourspace("b-w");

  const output = await pipeline
    .toFormat(format, useWebp ? { quality, effort: WEBP_EFFORT } : { quality, progressive: true, mozjpeg: true })
    .toBuffer();

  return { output, format };
}

module.exports = compress;
