const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const port = Number(process.env.WEB_PORT || 4300);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);

    if (requestUrl.pathname === "/health") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, service: "ai-alm-web" }));
      return;
    }

    const relativePath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const normalizedPath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, "");
    const filePath = path.join(rootDir, normalizedPath);

    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": mimeType });
    response.end(content);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Internal server error");
  }
});

server.listen(port, () => {
  console.log(`ai-alm-web listening on http://127.0.0.1:${port}`);
});
