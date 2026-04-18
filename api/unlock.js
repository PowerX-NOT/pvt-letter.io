const crypto = require("crypto");
const { getCollection } = require("./_db");
const { createSessionToken, setSessionCookie } = require("./_auth");

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const password = typeof body.password === "string" ? body.password.trim() : "";
    if (!password) {
      sendJson(res, 400, { ok: false, message: "Password is required." });
      return;
    }

    const collection = await getCollection();
    const secret = await collection.findOne({ key: "love_letter_password" });
    if (!secret || typeof secret.passwordHash !== "string") {
      sendJson(res, 500, { ok: false, message: "Password not configured." });
      return;
    }

    const typedHash = crypto.createHash("sha256").update(password, "utf8").digest("hex");
    if (typedHash !== secret.passwordHash) {
      sendJson(res, 401, { ok: false, message: "Wrong password." });
      return;
    }

    const token = createSessionToken();
    setSessionCookie(res, token);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("unlock_error", error && error.message ? error.message : error);
    const message = error && error.message ? error.message : "";

    if (message.includes("Missing MONGODB_URI")) {
      sendJson(res, 500, { ok: false, message: "Missing env: MONGODB_URI" });
      return;
    }
    if (message.includes("Missing SESSION_SECRET")) {
      sendJson(res, 500, { ok: false, message: "Missing env: SESSION_SECRET" });
      return;
    }
    if (message.includes("Unexpected token")) {
      sendJson(res, 400, { ok: false, message: "Invalid JSON body." });
      return;
    }

    sendJson(res, 500, { ok: false, message: "Server error." });
  }
};
