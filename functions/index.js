const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = 40;

// Request headers passed through to the origin so the fetch looks like the browser's own.
// accept-encoding is left out on purpose: fetch negotiates its own and decodes the body.
const FORWARDED_HEADERS = ["cookie", "dnt", "referer", "user-agent", "accept", "accept-language"];

// Lambda responses are capped at 6 MB and base64 adds a third, so larger
// originals are sent back as a redirect instead of being passed through.
const MAX_PASSTHROUGH_SIZE = 4 * 1024 * 1024;

function parseUrl(raw) {
  let url = raw;
  try {
    url = JSON.parse(url);
  } catch {}
  if (Array.isArray(url)) url = url.join("&url=");
  // Strip the prefix some mobile carriers' transparent proxies add
  return url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");
}

function parseQuality(raw) {
  const quality = parseInt(raw, 10);
  return quality >= 1 && quality <= 100 ? quality : DEFAULT_QUALITY;
}

const redirect = (url) => ({
  statusCode: 302,
  body: "",
  headers: { location: encodeURI(url) },
});

const image = (buffer, headers) => ({
  statusCode: 200,
  body: buffer.toString("base64"),
  isBase64Encoded: true,
  headers,
});

exports.handler = async (event) => {
  const query = event.queryStringParameters || {};
  if (!query.url) return { statusCode: 200, body: "bandwidth-hero-proxy" };

  const url = parseUrl(query.url);
  const useWebp = !query.jpeg || query.jpeg === "0";
  const grayscale = query.bw !== "0";
  const quality = parseQuality(query.l);
  const headers = event.headers || {};

  try {
    const clientIp = headers["x-forwarded-for"] || headers["x-nf-client-connection-ip"];
    const response = await fetch(url, {
      headers: {
        ...pick(headers, FORWARDED_HEADERS),
        ...(clientIp && { "x-forwarded-for": clientIp }),
      },
    });
    if (!response.ok) return redirect(url);

    const original = Buffer.from(await response.arrayBuffer());
    const originalType = response.headers.get("content-type") || "";
    const originalSize = original.length;
    const passthrough = () =>
      originalSize > MAX_PASSTHROUGH_SIZE
        ? redirect(url)
        : image(original, {
            "content-type": originalType,
            "x-original-size": String(originalSize),
            "x-bytes-saved": "0",
          });

    if (!shouldCompress(originalType, originalSize, useWebp)) return passthrough();

    const { output, format } = await compress(original, { useWebp, grayscale, quality });
    if (output.length >= originalSize) return passthrough();

    console.log(`${url}: ${originalSize} -> ${output.length} bytes`);
    return image(output, {
      "content-type": `image/${format}`,
      "x-original-size": String(originalSize),
      "x-bytes-saved": String(originalSize - output.length),
    });
  } catch (err) {
    console.error(`Failed to process ${url}:`, err);
    return redirect(url);
  }
};
