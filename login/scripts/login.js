/* =============================================================================
   LOGIN PAGE – FORM BEHAVIOUR
   -----------------------------------------------------------------------------
   (Page layout and the theme switch live in scripts/layout.js.)
     1. Show / hide password
     2. Captcha refresh
     3. Form submit (demo)
   ============================================================================= */

(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);


  /* ---------------------------------------------------------------------------
     1. SHOW / HIDE PASSWORD
     --------------------------------------------------------------------------- */
  const passwordInput = $("#password");
  const passwordToggle = $("#toggle-password");

  passwordToggle.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    passwordToggle.setAttribute("aria-pressed", String(show));
    passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });


  /* ---------------------------------------------------------------------------
     2. CAPTCHA REFRESH
     Six random characters, leaving out look-alikes (0/O, 1/I).
     NOTE: a real captcha must be generated and checked on the server.
     --------------------------------------------------------------------------- */
  const CAPTCHA_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const captchaInput = $("#captcha");
  const captchaCode = $("#captcha-code");
  const formStatus = $("#form-status");

  $("#refresh-captcha").addEventListener("click", () => {
    const randomValues = crypto.getRandomValues(new Uint32Array(6));
    captchaCode.textContent = Array.from(randomValues, (n) => CAPTCHA_ALPHABET[n % CAPTCHA_ALPHABET.length]).join("");
    captchaInput.value = "";
    captchaInput.setCustomValidity("");
    formStatus.textContent = "";
    captchaInput.focus();
  });

  captchaInput.addEventListener("input", () => captchaInput.setCustomValidity(""));


  /* ---------------------------------------------------------------------------
     3. FORM SUBMIT (demo)
     DEMO credentials (also shown on the page). Replace this check with a call
     to the real authentication service – never keep passwords in front-end code.
     --------------------------------------------------------------------------- */
  const DEMO_USERNAME = "investor";
  const DEMO_PASSWORD = "Invest@123";
  const usernameInput = $("#username");

  $("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();

    if (captchaInput.value.trim().toUpperCase() !== captchaCode.textContent) {
      captchaInput.setCustomValidity("Please enter the CAPTCHA shown.");
      captchaInput.reportValidity();
      return;
    }

    // Username is not case-sensitive; password is
    const usernameOk = usernameInput.value.trim().toLowerCase() === DEMO_USERNAME;
    const passwordOk = passwordInput.value === DEMO_PASSWORD;

    if (!usernameOk || !passwordOk) {
      formStatus.textContent = "Wrong username or password.";
      passwordInput.value = "";
      passwordInput.focus();
      return;
    }

    formStatus.textContent = "Signing in…";
    setTimeout(() => {
      location.href = "../dashboard/index.html?theme=" + document.documentElement.dataset.theme;
    }, 400);
  });
})();
