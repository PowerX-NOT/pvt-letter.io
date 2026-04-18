const { getCollection } = require("./_db");
const { isValidSession } = require("./_auth");

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  if (!isValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "Unauthorized." });
    return;
  }

  try {
    const collection = await getCollection();
    const doc = await collection.findOne({ key: "love_letter_content" });
    if (!doc || typeof doc.title !== "string" || !Array.isArray(doc.paragraphs)) {
      sendJson(res, 404, { ok: false, message: "Letter not configured." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      letter: {
        title: doc.title,
        paragraphs: doc.paragraphs.filter((x) => typeof x === "string"),
        closing: typeof doc.closing === "string" ? doc.closing : ""
      }
    });
  } catch (error) {
    console.error("letter_error", error && error.message ? error.message : error);
    const message = error && error.message ? error.message : "";
    if (message.includes("Missing MONGODB_URI")) {
      sendJson(res, 500, { ok: false, message: "Missing env: MONGODB_URI" });
      return;
    }
    sendJson(res, 500, { ok: false, message: "Server error." });
  }
};
