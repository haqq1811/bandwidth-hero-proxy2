const MIN_COMPRESS_LENGTH = 1024;
// PNGs and GIFs below this size usually grow when converted to JPEG.
const MIN_JPEG_FROM_LOSSLESS_LENGTH = 100 * 1024;

function shouldCompress(type, size, useWebp) {
  if (!type.startsWith("image/")) return false;
  // Rasterising SVG rarely helps, and Sharp can't read ICO
  if (type.includes("svg") || type.includes("icon")) return false;
  if (!(size >= MIN_COMPRESS_LENGTH)) return false;
  if (!useWebp && /png|gif/.test(type) && size < MIN_JPEG_FROM_LOSSLESS_LENGTH) return false;
  return true;
}

module.exports = shouldCompress;
