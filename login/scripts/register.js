/* =============================================================================
   REGISTER PAGE – 4-STEP SIGN-UP (Mobile → OTP → Password → Complete)
   -----------------------------------------------------------------------------
   (Page layout and the theme switch live in scripts/layout.js.)
     1. Helpers + moving between steps
     2. Step 1 – mobile number
     3. Step 2 – OTP boxes, resend timer, verify
     4. Step 3 – password, strength meter, confirm
     5. Step 4 – done

   DEMO ONLY: there is no server yet. The OTP is always 111111 (shown on
   screen); nothing is saved. Replace the marked parts with API calls.
   ============================================================================= */

(function () {
  "use strict";


  /* ---------------------------------------------------------------------------
     1. HELPERS + MOVING BETWEEN STEPS
     --------------------------------------------------------------------------- */
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const steps = $$(".step");          // stepper items
  const panels = $$(".step-panel");   // one panel per step
  const status = $("#form-status");
  const loginInstead = $("#login-instead");

  let mobileNumber = "";
  let demoOtp = "";

  // Show step `number` (1–4): earlier steps "done", this one "current", later "todo"
  function goToStep(number) {
    steps.forEach((step, index) => {
      const position = index + 1;
      step.dataset.state = position < number ? "done" : position === number ? "current" : "todo";
      if (position === number) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });

    panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== number;
    });

    loginInstead.hidden = number === 4;

    // Focus the first field of the new step
    panels[number - 1].querySelector("input")?.focus();
  }

  // "Change" link on the OTP step goes back to the mobile number
  $$("[data-go-to]").forEach((button) => {
    button.addEventListener("click", () => {
      status.textContent = "";
      goToStep(Number(button.dataset.goTo));
    });
  });


  /* ---------------------------------------------------------------------------
     2. STEP 1 – MOBILE NUMBER
     Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9.
     --------------------------------------------------------------------------- */
  const mobileInput = $("#mobile");

  // Digits only
  mobileInput.addEventListener("input", () => {
    mobileInput.value = mobileInput.value.replace(/\D/g, "").slice(0, 10);
    mobileInput.setCustomValidity("");
  });

  $("#mobile-form").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!/^[6-9]\d{9}$/.test(mobileInput.value)) {
      mobileInput.setCustomValidity("Enter a valid 10-digit mobile number.");
      mobileInput.reportValidity();
      return;
    }

    mobileNumber = mobileInput.value;
    $("#otp-number").textContent = "+91 " + mobileNumber.slice(0, 5) + " " + mobileNumber.slice(5);
    sendOtp();
    goToStep(2);
  });


  /* ---------------------------------------------------------------------------
     3. STEP 2 – OTP
     One real <input id="otp"> takes all six digits (so fast typing, Backspace
     and pasting always work); the six boxes under it only display them.
     --------------------------------------------------------------------------- */
  const otpInput = $("#otp");
  const otpBoxes = $$(".otp-box");
  const resendButton = $("#resend-otp");
  let resendTimer = null;

  // Copy the digits into the boxes; highlight the box the next digit goes into
  function showOtpDigits() {
    const digits = otpInput.value;
    const focused = document.activeElement === otpInput;
    otpBoxes.forEach((box, index) => {
      box.textContent = digits[index] || "";
      const isNext = index === Math.min(digits.length, otpBoxes.length - 1);
      box.toggleAttribute("data-active", focused && isNext);
    });
  }

  // Digits only, at most six (also cleans up pasted text like "OTP: 123 456")
  otpInput.addEventListener("input", () => {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    showOtpDigits();
  });
  otpInput.addEventListener("focus", showOtpDigits);
  otpInput.addEventListener("blur", showOtpDigits);

  // Keep the demo code on screen, adding a message in front of it when needed
  function showDemoOtp(message) {
    const demoNote = "Demo OTP: " + demoOtp + " (sent by SMS in the live portal)";
    status.textContent = message ? message + " " + demoNote : demoNote;
  }

  // DEMO: the code is always 111111 and shown on screen.
  // A real portal generates a code on the server and sends it by SMS.
  const DEMO_OTP = "111111";

  function sendOtp() {
    demoOtp = DEMO_OTP;
    showDemoOtp();

    otpInput.value = "";
    showOtpDigits();
    startResendCountdown(30);
  }

  // "Resend OTP in 0:30" counts down, then becomes a link
  function startResendCountdown(seconds) {
    clearInterval(resendTimer);
    resendButton.disabled = true;

    let remaining = seconds;
    const tick = () => {
      resendButton.textContent = "Resend OTP in 0:" + String(remaining).padStart(2, "0");
      if (remaining-- <= 0) {
        clearInterval(resendTimer);
        resendButton.disabled = false;
        resendButton.textContent = "Resend OTP";
      }
    };

    tick();
    resendTimer = setInterval(tick, 1000);
  }

  resendButton.addEventListener("click", () => {
    sendOtp();
    otpInput.focus();
  });

  $("#otp-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const entered = otpInput.value;
    if (entered.length < 6) {
      showDemoOtp("Enter all 6 digits.");
      otpInput.focus();
      return;
    }

    // DEMO check – a real portal verifies the code on the server
    if (entered !== demoOtp) {
      showDemoOtp("That OTP doesn't match.");
      otpInput.select();
      return;
    }

    clearInterval(resendTimer);
    status.textContent = "";
    goToStep(3);
  });


  /* ---------------------------------------------------------------------------
     4. STEP 3 – PASSWORD
     Strength: one point each for length ≥ 8, a letter, a number, and
     length ≥ 12 or a symbol. At least "Fair" (letters + numbers, 8+) is needed.
     --------------------------------------------------------------------------- */
  const passwordInput = $("#new-password");
  const confirmInput = $("#confirm-password");
  const strengthBars = $("#strength-bars");
  const strengthLabel = $("#strength-label");
  const STRENGTH_NAMES = ["Too short", "Weak", "Fair", "Good", "Strong"];

  function passwordStrength(password) {
    if (password.length < 8) return password ? 1 : 0;
    let score = 1;
    if (/[A-Za-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  passwordInput.addEventListener("input", () => {
    const level = passwordStrength(passwordInput.value);
    strengthBars.dataset.level = level;
    strengthLabel.textContent = STRENGTH_NAMES[level];
    passwordInput.setCustomValidity("");
  });

  confirmInput.addEventListener("input", () => confirmInput.setCustomValidity(""));

  // Show / hide password
  $$("[data-toggle-password]").forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  $("#password-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const password = passwordInput.value;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      passwordInput.setCustomValidity("Use at least 8 characters with letters and numbers.");
      passwordInput.reportValidity();
      return;
    }

    if (confirmInput.value !== password) {
      confirmInput.setCustomValidity("The passwords don't match.");
      confirmInput.reportValidity();
      return;
    }

    // DEMO: a real portal creates the account on the server here
    $("#done-number").textContent = "+91 " + mobileNumber.slice(0, 5) + " " + mobileNumber.slice(5);
    status.textContent = "";
    goToStep(4);
  });


  /* ---------------------------------------------------------------------------
     5. STEP 4 – DONE
     "Go to Dashboard" keeps the current theme.
     --------------------------------------------------------------------------- */
  $("#go-to-dashboard").addEventListener("click", (event) => {
    event.preventDefault();
    location.href = "../dashboard/index.html?theme=" + document.documentElement.dataset.theme;
  });

  goToStep(1);
})();
