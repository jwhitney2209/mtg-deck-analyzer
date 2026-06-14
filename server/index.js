import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { analyzeDeck } from "./analyzer.js";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const DIST_DIR = resolve("dist");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function serveStaticAsset(req, res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(join(DIST_DIR, requestedPath));

  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type":
        contentTypes.get(extname(filePath)) ?? "application/octet-stream"
    });
    res.end(file);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/analyze") {
    try {
      const body = await readJsonBody(req);
      const commanderName = String(body.commanderName ?? "").trim();
      const deckText = String(body.deckText ?? "").trim();

      if (!commanderName) {
        sendJson(res, 400, { error: "Please enter your commander first." });
        return;
      }

      if (!deckText) {
        sendJson(res, 400, { error: "Please paste a decklist first." });
        return;
      }

      sendJson(res, 200, {
        analysis: await analyzeDeck({ commanderName, deckText })
      });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        error: error.message ?? "Unable to analyze deck."
      });
    }

    return;
  }

  if (req.method === "GET") {
    await serveStaticAsset(req, res, url.pathname);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, {
      error: error.message ?? "Unexpected server error."
    });
  });
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
