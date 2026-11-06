/* =============================================================================
   INVESTOR PROFILE – SELECT PROFILE TYPE
   -----------------------------------------------------------------------------
   (Theme switch and sidebar come from scripts/dashboard.js.)
     • Continue stays disabled until a track is chosen.
     • The choice is remembered in this browser and pre-selected next time.

     • Continue opens profile-form.html with the chosen track (?track=…).
   ============================================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "mpProfileTrack";

  const TRACKS = {
    tender: "Tender Based Application (investment less than ₹100 Cr)",
    direct: "Direct Investment Application (investment greater than ₹100 Cr)",
  };

  const form = document.getElementById("profile-type-form");
  const continueButton = document.getElementById("profile-continue");
  const status = document.getElementById("profile-status");
  const options = [...form.querySelectorAll('input[name="profile-type"]')];

  // Enable Continue as soon as a track is picked
  function syncContinue() {
    continueButton.disabled = !options.some((option) => option.checked);
    status.textContent = "";
  }

  options.forEach((option) => option.addEventListener("change", syncContinue));

  // Pre-select the track chosen last time (if any)
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const match = options.find((option) => option.value === saved);
    if (match) match.checked = true;
  } catch (error) {
    /* storage blocked: start with nothing selected */
  }
  syncContinue();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const chosen = options.find((option) => option.checked);
    if (!chosen) return;

    try {
      localStorage.setItem(STORAGE_KEY, chosen.value);
    } catch (error) {
      /* storage blocked: the choice just isn't remembered */
    }

    // Open the investor profile form for the chosen track
    status.textContent = "Opening the profile form for " + TRACKS[chosen.value] + "…";
    location.href = "profile-form.html?track=" + chosen.value;
  });
})();
