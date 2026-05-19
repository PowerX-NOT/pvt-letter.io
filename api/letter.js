const { getCollection } = require("./_db");
const { isValidSession } = require("./_auth");

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function normalizePage(page, index, doc, totalPages) {
  if (!page || !Array.isArray(page.paragraphs)) return null;
  const paragraphs = page.paragraphs.filter((x) => typeof x === "string");
  if (paragraphs.length === 0) return null;

  const pageNumber = typeof page.page === "number" ? page.page : index + 1;
  const isLastPage = index === totalPages - 1;
  const title =
    typeof page.title === "string"
      ? page.title
      : index === 0 && typeof doc.title === "string"
        ? doc.title
        : "";
  const closing =
    typeof page.closing === "string"
      ? page.closing
      : isLastPage && typeof doc.closing === "string"
        ? doc.closing
        : "";
  const date =
    typeof page.date === "string"
      ? page.date
      : index === 0 && typeof doc.date === "string"
        ? doc.date
        : "";

  return { page: pageNumber, title, paragraphs, closing, date };
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
    if (!doc) {
      sendJson(res, 404, { ok: false, message: "Letter not configured." });
      return;
    }

    let pages = [];

    if (Array.isArray(doc.pages) && doc.pages.length > 0) {
      const totalPages = doc.pages.length;
      pages = doc.pages
        .map((page, index) => normalizePage(page, index, doc, totalPages))
        .filter(Boolean);
    } else if (Array.isArray(doc.paragraphs)) {
      const paragraphs = doc.paragraphs.filter((x) => typeof x === "string");
      if (paragraphs.length > 0) {
        pages = [
          normalizePage(
            {
              page: 1,
              title: typeof doc.title === "string" ? doc.title : "",
              paragraphs,
              closing: typeof doc.closing === "string" ? doc.closing : "",
              date: typeof doc.date === "string" ? doc.date : ""
            },
            0,
            doc,
            1
          )
        ].filter(Boolean);
      }
    }

    if (pages.length === 0) {
      sendJson(res, 404, { ok: false, message: "Letter not configured." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      letter: { pages }
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
