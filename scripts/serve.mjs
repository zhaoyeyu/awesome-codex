import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json"
});

const securityHeaders = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin"
});

function send(response, statusCode, body, type = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, { ...securityHeaders, "Content-Type": type, "Cache-Control": "no-store" });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method || "")) {
    send(response, 405, "Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
  } catch {
    send(response, 400, "Bad request");
    return;
  }

  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const candidate = path.resolve(root, `.${requested}`);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    send(response, 403, "Forbidden");
    return;
  }

  try {
    const info = await stat(candidate);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      ...securityHeaders,
      "Content-Type": contentTypes[path.extname(candidate).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(candidate).pipe(response);
  } catch {
    send(response, 404, "Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Codex Atlas is available at http://${host}:${port}`);
  console.log("Press Ctrl+C to stop the server.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
