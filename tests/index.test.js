const http = require("http");
const sharp = require("sharp");
const { test, expect, beforeAll, afterAll } = require("@jest/globals");
const { handler } = require("../functions/index");
const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");

let server, baseUrl, photo;

beforeAll(async () => {
  photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#3a7" } })
    .jpeg({ quality: 95 })
    .toBuffer();
  server = http.createServer((req, res) => {
    if (req.url === "/photo.jpg") {
      res.writeHead(200, { "content-type": "image/jpeg" });
      res.end(photo);
    } else if (req.url === "/page.html") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html></html>");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => server.close());

const call = (query) => handler({ queryStringParameters: query, headers: {} });
const decode = (response) => Buffer.from(response.body, "base64");

test("returns the service name when no url is given", async () => {
  const response = await call({});
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe("bandwidth-hero-proxy");
});

test("compresses an image to WebP by default", async () => {
  const response = await call({ url: `${baseUrl}/photo.jpg`, bw: "0", l: "40" });
  const output = decode(response);
  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toBe("image/webp");
  expect(output.length).toBeLessThan(photo.length);
  expect(response.headers["x-original-size"]).toBe(String(photo.length));
  expect(response.headers["x-bytes-saved"]).toBe(String(photo.length - output.length));
  expect((await sharp(output).metadata()).format).toBe("webp");
});

test("compresses to grayscale JPEG when requested", async () => {
  const response = await call({ url: `${baseUrl}/photo.jpg`, jpeg: "1", bw: "1" });
  const output = decode(response);
  const { format, channels } = await sharp(output).metadata();
  expect(response.headers["content-type"]).toBe("image/jpeg");
  expect(format).toBe("jpeg");
  expect(channels).toBe(1);
});

test("passes non-image responses through untouched", async () => {
  const response = await call({ url: `${baseUrl}/page.html` });
  expect(response.statusCode).toBe(200);
  expect(decode(response).toString()).toBe("<html></html>");
});

test("redirects to the original when the origin fails", async () => {
  const response = await call({ url: `${baseUrl}/missing.jpg` });
  expect(response.statusCode).toBe(302);
  expect(response.headers.location).toBe(`${baseUrl}/missing.jpg`);
});

test("shouldCompress skips tiny, vector and non-image files", () => {
  expect(shouldCompress("image/jpeg", 50000, true)).toBe(true);
  expect(shouldCompress("image/jpeg", 100, true)).toBe(false);
  expect(shouldCompress("image/svg+xml", 50000, true)).toBe(false);
  expect(shouldCompress("text/html", 50000, true)).toBe(false);
  expect(shouldCompress("image/png", 50000, false)).toBe(false);
  expect(shouldCompress("image/png", 50000, true)).toBe(true);
});

test("pick forwards only the requested headers", () => {
  const headers = { "user-agent": "Mozilla/5.0", cookie: "session=abc123", host: "nope", authorization: "nope" };
  expect(pick(headers, ["user-agent", "cookie", "dnt"])).toEqual({ "user-agent": "Mozilla/5.0", cookie: "session=abc123" });
  expect(pick(undefined, ["cookie"])).toEqual({});
});
