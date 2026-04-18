const crypto = require("crypto");

const TOKEN_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 30);
const SESSION_SECRET = process.env.SESSION_SECRET || "";

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSignature(payloadB64) {
  return base64Url(crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest());
}

function createSessionToken() {
  if (!SESSION_SECRET) throw new Error("Missing SESSION_SECRET");
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = base64Url(payload);
  const signature = createSignature(payloadB64);
  return `${payloadB64}.${signature}`;
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const value = part.trim();
    if (value.startsWith(`${name}=`)) return decodeURIComponent(value.slice(name.length + 1));
  }
  return "";
}

function isValidSession(req) {
  if (!SESSION_SECRET) return false;
  const token = readCookie(req, "sid");
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expected = createSignature(payloadB64);
  const givenBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (givenBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(givenBuf, expectedBuf)) return false;

  try {
    const payloadRaw = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64")
      .toString("utf8");
    const payload = JSON.parse(payloadRaw);
    return typeof payload.exp === "number" && Date.now() <= payload.exp;
  } catch {
    return false;
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(TOKEN_TTL_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `sid=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
}

module.exports = { createSessionToken, isValidSession, setSessionCookie };
