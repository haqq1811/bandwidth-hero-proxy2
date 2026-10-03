const MIN_COMPRESS_LENGTH = 1024;
const MIN_TRANSPARENT_COMPRESS_LENGTH = 102400;

function shouldCompress(imageType, size, isTransparent) {
  // Missing or non-image content type
  if (typeof imageType !== "string" || !imageType.startsWith("image")) return false;

  // Vector and icon formats: rasterising SVG rarely helps, and Sharp can't read ICO
  if (imageType.includes("svg") || imageType.includes("icon")) return false;

  // Empty, missing or non-numeric size
  if (!(size > 0)) return false;

  // Same rules as before, just spelled out one per line
  if (isTransparent && size < MIN_COMPRESS_LENGTH) return false;

  if (
    !isTransparent &&
    (imageType.endsWith("png") || imageType.endsWith("gif")) &&
    size < MIN_TRANSPARENT_COMPRESS_LENGTH
  ) {
    return false;
  }

  return true;
}

module.exports = shouldCompress;
