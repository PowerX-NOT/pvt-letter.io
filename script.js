const SESSION_KEY = "love_letter_unlocked";

const gate = document.querySelector("#gate");
const form = document.querySelector("#gate-form");
const passwordInput = document.querySelector("#password-input");
const errorText = document.querySelector("#gate-error");
const letter = document.querySelector("#letter");
const letterTitle = document.querySelector("#letter-title");
const letterBody = document.querySelector("#letter-body");
const closingEl = document.querySelector("#letter-closing");

function showLetter() {
  if (gate) gate.classList.add("hidden");
  if (letter) letter.classList.remove("hidden");
}

function renderLetter(data) {
  if (!data || !Array.isArray(data.paragraphs)) return;
  if (letterTitle && typeof data.title === "string") letterTitle.textContent = data.title;
  if (letterBody) {
    letterBody.innerHTML = "";
    data.paragraphs.forEach((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      letterBody.appendChild(p);
    });
  }
  if (closingEl && typeof data.closing === "string" && data.closing.trim()) {
    const [line1, line2 = ""] = data.closing.split("\n");
    closingEl.innerHTML = `${line1}<br />${line2}`;
    closingEl.classList.remove("hidden");
  }
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
