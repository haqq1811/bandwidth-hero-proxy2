// Compresses an image using the Sharp library
const sharp = require("sharp");

// WebP encoder effort: 0 (fastest) to 6 (smallest). Sharp's default is 4.
// On my test images, 2 was about 40% faster than 4 for files ~5% larger.
const WEBP_EFFORT = 2;

// true: animated GIFs stay animated when the output is WebP (bigger and slower).
// false: only the first frame is kept, as before.
const KEEP_ANIMATION = false;

async function compress(imagePath, useWebp, grayscale, quality, originalSize) {
  const format = useWebp ? "webp" : "jpeg";
  const animated = KEEP_ANIMATION && useWebp;

  try {
    let pipeline = sharp(imagePath, { animated });

    // Metadata is stripped on output, so apply the EXIF orientation first;
    // otherwise phone photos come out sideways.
    if (!animated) pipeline = pipeline.rotate();

    // Sharp treats grayscale(undefined) as "turn grayscale on", so be strict.
    pipeline = pipeline.grayscale(grayscale === true);

    // JPEG has no alpha channel; without this, transparent areas turn black.
    if (!useWebp) pipeline = pipeline.flatten({ background: "#ffffff" });

    const options = useWebp
      ? { quality, effort: WEBP_EFFORT }
      : { quality, progressive: true, optimizeScans: true };

    const { data, info } = await pipeline
      .toFormat(format, options)
      .toBuffer({ resolveWithObject: true });

    return {
      err: null,
      // false when the "compressed" file is not actually smaller than the original
      smaller: info.size < originalSize,
      headers: {
        "content-type": `image/${format}`,
        "content-length": info.size,
        "x-original-size": originalSize,
        "x-bytes-saved": originalSize - info.size,
      },
      output: data,
    };
  } catch (err) {
    return { err };
  }
}

module.exports = compress;
