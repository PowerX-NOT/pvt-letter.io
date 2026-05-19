const SESSION_KEY = "love_letter_unlocked";
const PARAGRAPHS_PER_PAGE = 2;

const gate = document.querySelector("#gate");
const form = document.querySelector("#gate-form");
const passwordInput = document.querySelector("#password-input");
const errorText = document.querySelector("#gate-error");
const letter = document.querySelector("#letter");
const letterTitle = document.querySelector("#letter-title");
const letterBody = document.querySelector("#letter-body");
const closingEl = document.querySelector("#letter-closing");
const paginationEl = document.querySelector("#letter-pagination");
const pageSelect = document.querySelector("#page-select");
const pagePrev = document.querySelector("#page-prev");
const pageNext = document.querySelector("#page-next");

let letterData = null;
let currentPage = 1;
let totalPages = 1;

function showLetter() {
  if (gate) gate.classList.add("hidden");
  if (letter) letter.classList.remove("hidden");
}

function chunkParagraphs(paragraphs, perPage) {
  const pages = [];
  for (let i = 0; i < paragraphs.length; i += perPage) {
    pages.push(paragraphs.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

function renderParagraphs(paragraphs) {
  if (!letterBody) return;
  letterBody.innerHTML = "";
  paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    letterBody.appendChild(p);
  });
}

function updateClosingVisibility() {
  if (!closingEl || !letterData) return;
  const hasClosing = typeof letterData.closing === "string" && letterData.closing.trim();
  if (!hasClosing) {
    closingEl.classList.add("hidden");
    return;
  }
  if (currentPage === totalPages) {
    const [line1, line2 = ""] = letterData.closing.split("\n");
    closingEl.innerHTML = `${line1}<br />${line2}`;
    closingEl.classList.remove("hidden");
  } else {
    closingEl.classList.add("hidden");
  }
}

function showPage(page) {
  if (!letterData) return;
  currentPage = Math.max(1, Math.min(page, totalPages));
  const pages = chunkParagraphs(letterData.paragraphs, PARAGRAPHS_PER_PAGE);
  renderParagraphs(pages[currentPage - 1]);
  updateClosingVisibility();

  if (pageSelect) pageSelect.value = String(currentPage);
  if (pagePrev) pagePrev.disabled = currentPage === 1;
  if (pageNext) pageNext.disabled = currentPage === totalPages;
}

function setupPagination(data) {
  letterData = data;
  const pages = chunkParagraphs(data.paragraphs, PARAGRAPHS_PER_PAGE);
  totalPages = pages.length;
  currentPage = 1;

  if (pageSelect) {
    pageSelect.innerHTML = "";
    for (let i = 1; i <= totalPages; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `Page ${i}`;
      pageSelect.appendChild(option);
    }
  }

  if (paginationEl) {
    paginationEl.classList.toggle("hidden", totalPages <= 1);
  }

  showPage(1);
}

function renderLetter(data) {
  if (!data || !Array.isArray(data.paragraphs)) return;
  if (letterTitle && typeof data.title === "string") letterTitle.textContent = data.title;
  setupPagination(data);
}

async function loadLetter() {
  const response = await fetch("/api/letter", { method: "GET", credentials: "same-origin" });
  if (!response.ok) throw new Error("unauthorized");
  const payload = await response.json();
  if (!payload.ok || !payload.letter) throw new Error("invalid payload");
  renderLetter(payload.letter);
}

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  loadLetter()
    .then(() => showLetter())
    .catch(() => sessionStorage.removeItem(SESSION_KEY));
}

if (pageSelect) {
  pageSelect.addEventListener("change", () => {
    showPage(Number(pageSelect.value));
  });
}

if (pagePrev) {
  pagePrev.addEventListener("click", () => {
    showPage(currentPage - 1);
  });
}

if (pageNext) {
  pageNext.addEventListener("click", () => {
    showPage(currentPage + 1);
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (errorText) errorText.textContent = "";

    const password = passwordInput ? passwordInput.value.trim() : "";
    if (!password) {
      if (errorText) errorText.textContent = "Please enter password.";
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    const originalLabel = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="btn-spinner"></span>Unlocking…`;
    }

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        if (errorText) errorText.textContent = "Wrong password. Try again.";
        if (passwordInput) passwordInput.value = "";
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
        return;
      }

      await loadLetter();
    } catch (error) {
      if (errorText) errorText.textContent = "Cannot verify now. Try again.";
      if (passwordInput) passwordInput.value = "";
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "1");
    showLetter();
  });
}
