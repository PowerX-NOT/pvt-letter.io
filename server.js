const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const PORT = Number(process.env.PORT || 8080);
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "love_letter";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "secrets";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 30);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const sessions = new Map();
let mongoClient;

function getMongoClient() {
  if (!mongoClient) mongoClient = new MongoClient(MONGODB_URI);
  return mongoClient;
}

async function getSecretsCollection() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");
  const client = getMongoClient();
  await client.connect();
  return client.db(MONGODB_DB).collection(MONGODB_COLLECTION);
}

async function verifyPassword(password) {
  const collection = await getSecretsCollection();
  const secret = await collection.findOne({ key: "love_letter_password" });
  if (!secret || typeof secret.passwordHash !== "string") return false;
  const typedHash = crypto.createHash("sha256").update(password, "utf8").digest("hex");
  return typedHash === secret.passwordHash;
}

async function getLetterFromMongo() {
  const collection = await getSecretsCollection();
  const doc = await collection.findOne({ key: "love_letter_content" });
  if (!doc || typeof doc.title !== "string" || !Array.isArray(doc.paragraphs)) return null;
  return {
    title: doc.title,
    paragraphs: doc.paragraphs.filter((item) => typeof item === "string"),
    closing: typeof doc.closing === "string" ? doc.closing : "Yours always,\nPugal"
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getCookieValue(req, key) {
  const raw = req.headers.cookie || "";
  const parts = raw.split(";").map((entry) => entry.trim());
  for (const part of parts) {
    if (part.startsWith(`${key}=`)) return decodeURIComponent(part.slice(key.length + 1));
  }
  return "";
}

function createSession(res) {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, Date.now() + SESSION_TTL_MS);
  res.setHeader(
    "Set-Cookie",
    `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}`
  );
}

function hasValidSession(req) {
  const sid = getCookieValue(req, "sid");
  if (!sid) return false;
  const expiresAt = sessions.get(sid);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(sid);
    return false;
  }
  sessions.set(sid, Date.now() + SESSION_TTL_MS);
  return true;
}

function serveStatic(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const absolute = path.join(__dirname, safePath);
  if (!absolute.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  fs.readFile(absolute, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return;
    }
    const ext = path.extname(absolute).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("ok");
    return;
  }

  if (requestUrl.pathname === "/api/unlock" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 16) req.destroy();
    });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const password = typeof parsed.password === "string" ? parsed.password.trim() : "";
        if (!password) {
          sendJson(res, 400, { ok: false, message: "Password is required." });
          return;
        }
        const ok = await verifyPassword(password);
        if (!ok) {
          sendJson(res, 401, { ok: false, message: "Wrong password." });
          return;
        }
        createSession(res);
        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendJson(res, 500, { ok: false, message: "Server error." });
      }
    });
    return;
  }

  if (requestUrl.pathname === "/api/letter" && req.method === "GET") {
    if (!hasValidSession(req)) {
      sendJson(res, 401, { ok: false, message: "Unauthorized." });
      return;
    }
    getLetterFromMongo()
      .then((letter) => {
        if (!letter) {
          sendJson(res, 404, { ok: false, message: "Letter not configured." });
          return;
        }
        sendJson(res, 200, { ok: true, letter });
      })
      .catch(() => sendJson(res, 500, { ok: false, message: "Server error." }));
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  serveStatic(requestUrl.pathname, res);
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`Listening on http://localhost:${PORT}\n`);
});
