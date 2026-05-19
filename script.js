const SESSION_KEY = "love_letter_unlocked";

const gate = document.querySelector("#gate");
const form = document.querySelector("#gate-form");
const passwordInput = document.querySelector("#password-input");
const errorText = document.querySelector("#gate-error");
const letter = document.querySelector("#letter");
const letterTitle = document.querySelector("#letter-title");
const letterDate = document.querySelector("#letter-date");
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

function renderParagraphs(paragraphs) {
  if (!letterBody) return;
  letterBody.innerHTML = "";
  paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    letterBody.appendChild(p);
  });
}

function renderClosing(closing) {
  if (!closingEl) return;
  if (typeof closing === "string" && closing.trim()) {
    const [line1, line2 = ""] = closing.split("\n");
    closingEl.innerHTML = `${line1}<br />${line2}`;
    closingEl.classList.remove("hidden");
  } else {
    closingEl.classList.add("hidden");
  }
}

function renderTitle(title) {
  if (!letterTitle) return;
  if (typeof title === "string" && title.trim()) {
    letterTitle.textContent = title;
    letterTitle.classList.remove("hidden");
  } else {
    letterTitle.classList.add("hidden");
  }
}

function renderDate(date) {
  if (!letterDate) return;
  if (typeof date === "string" && date.trim()) {
    letterDate.textContent = date;
    letterDate.classList.remove("hidden");
  } else {
    letterDate.textContent = "";
    letterDate.classList.add("hidden");
  }
}

function showPage(page) {
  if (!letterData || !Array.isArray(letterData.pages)) return;
  currentPage = Math.max(1, Math.min(page, totalPages));
  const pageData = letterData.pages[currentPage - 1];
  renderTitle(pageData.title);
  renderDate(pageData.date);
  renderParagraphs(pageData.paragraphs);
  renderClosing(pageData.closing);

  if (pageSelect) pageSelect.value = String(currentPage);
  if (pagePrev) pagePrev.disabled = currentPage === 1;
  if (pageNext) pageNext.disabled = currentPage === totalPages;
}

function setupPagination(data) {
  letterData = data;
  totalPages = Array.isArray(data.pages) ? data.pages.length : 1;
  currentPage = 1;

  if (pageSelect) {
    pageSelect.innerHTML = "";
    for (let i = 1; i <= totalPages; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `Letter ${i}`;
      pageSelect.appendChild(option);
    }
  }

  if (paginationEl) {
    paginationEl.classList.toggle("hidden", totalPages <= 1);
  }

  showPage(1);
}

function renderLetter(data) {
  if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return;
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
