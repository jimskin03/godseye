import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, posix } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./dist/", import.meta.url));
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "5173", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  if (relative === ".." || relative.startsWith(`..${posix.sep}`) || relative.includes("\\..")) {
    return null;
  }
  return join(root, relative);
}

async function resolveFile(urlPath) {
  const requested = safePath(urlPath);
  if (!requested) return null;

  try {
    const details = await stat(requested);
    if (details.isFile()) return requested;
  } catch {
    // Fall through to the SPA entry point for client-side routes.
  }

  if (!extname(urlPath)) {
    const fallback = join(root, "index.html");
    try {
      const details = await stat(fallback);
      if (details.isFile()) return fallback;
    } catch {
      // The build is invalid; the request below becomes a 404.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  const filePath = await resolveFile(pathname);
  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const details = await stat(filePath);
  response.writeHead(200, {
    "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    "Content-Length": details.size,
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`godseye static server listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
