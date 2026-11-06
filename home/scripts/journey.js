/* =============================================================================
   HOW IT WORKS – FIVE-STEP JOURNEY
   -----------------------------------------------------------------------------
   Builds the five steps inside <div class="journey" id="journey"> and draws a
   curved SVG path through the step circles. While you scroll:
     • the coloured path draws itself down the page,
     • each step's card fades up the first time it comes into view (data-seen),
     • each circle lights up and its icon draws in when the path reaches it
       (data-active).
   Colours come from the --journey-* variables in home/styles/input.css (5.9), so the
   path follows the theme without any script changes.
   ============================================================================= */

(function () {
  "use strict";

  const container = document.getElementById("journey");
  if (!container) return;

  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ---------------------------------------------------------------------------
     STEP CONTENT: [title, description, tag]
     --------------------------------------------------------------------------- */
  const STEPS = [
    [
      "Register",
      "Create an account with your mobile number and a one-time password.",
      "About 5 minutes",
    ],
    [
      "Build your verified profile",
      "PAN and GST are checked instantly. Choose the tender track (under ₹100 Cr) or Mega Track (₹100 Cr and above).",
      "Save and finish later",
    ],
    [
      "Choose your land",
      "Pick a parcel from the land bank and submit an Intention to Invest, or propose private land you have identified.",
      "Track status online",
    ],
    [
      "Tender and Letter of Award",
      "The department floats a tender for the parcel. The winning bidder receives a Letter of Award (LOA).",
      "Bid window shown in advance",
    ],
    [
      "Pay, lease and build",
      "10% of the premium within 10 days of the LOA and the balance within 60 days. Then upload the DPR, lease deed and bank guarantee.",
      "Deadlines counted for you",
    ],
  ];

  /* ---------------------------------------------------------------------------
     STEP ICONS (40×40 line drawings). pathLength="1" lets CSS draw them in.
     Phone with tick · verified shield · map · document with seal · building
     --------------------------------------------------------------------------- */
  const ICONS = [
    '<rect pathLength="1" x="11" y="4" width="18" height="32" rx="4"/><path pathLength="1" d="M17 30h6M15 14l4 4 7-7"/>',
    '<path pathLength="1" d="M20 4 6 10v10c0 9 6 14 14 16 8-2 14-7 14-16V10z"/><path pathLength="1" d="m14 20 4 4 8-8"/>',
    '<path pathLength="1" d="m14 8-9 3v22l9-3 12 3 9-3V8l-9 3zM14 8v22M26 11v22"/>',
    '<path pathLength="1" d="M10 4h14l8 8v24H10z"/><path pathLength="1" d="M24 4v8h8M15 20h12M15 26h8"/><circle pathLength="1" cx="27" cy="29" r="4"/>',
    '<path pathLength="1" d="M4 34h32M8 34V18l12-10 12 10v16"/><path pathLength="1" d="M16 34v-9h8v9M20 4v4"/>',
  ];


  /* ---------------------------------------------------------------------------
     BUILD THE MARKUP
     --------------------------------------------------------------------------- */
  const pathSvg = `
    <svg class="journey-svg" aria-hidden="true">
      <defs>
        <linearGradient id="journey-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="journey-gradient-start"/>
          <stop offset=".55" class="journey-gradient-mid"/>
          <stop offset="1" class="journey-gradient-end"/>
        </linearGradient>
      </defs>
      <path class="journey-trail"/>
      <path class="journey-path" stroke="url(#journey-gradient)"/>
    </svg>`;

  const stepsHtml = STEPS.map(
    ([title, description, tag], index) => `
    <div class="journey-step" role="listitem">
      <div class="journey-dot">
        <svg viewBox="0 0 40 40" aria-hidden="true">${ICONS[index]}</svg>
        <b class="journey-number">0${index + 1}</b>
      </div>
      <div class="journey-card">
        <h3>${title}</h3>
        <p>${description}</p>
        <span class="journey-tag">${tag}</span>
      </div>
    </div>`
  ).join("");

  container.innerHTML = pathSvg + stepsHtml;
  container.setAttribute("role", "list");
  if (!prefersReducedMotion) container.setAttribute("data-animate", "");

  const svg = container.querySelector(".journey-svg");
  const trail = container.querySelector(".journey-trail");
  const path = container.querySelector(".journey-path");
  const steps = [...container.querySelectorAll(".journey-step")];
  let pathLength = 0;


  /* ---------------------------------------------------------------------------
     DRAW THE CURVE through the centre of every step circle.
     Each segment bows left or right alternately (a gentle S-curve).
     Re-run whenever the layout changes size.
     --------------------------------------------------------------------------- */
  function buildPath() {
    const box = container.getBoundingClientRect();

    const points = steps.map((step) => {
      const dot = step.querySelector(".journey-dot").getBoundingClientRect();
      return [dot.left - box.left + dot.width / 2, dot.top - box.top + dot.height / 2];
    });

    const sway = innerWidth > 720 ? Math.min(140, box.width * 0.1) : 0;
    let d = "M" + points[0][0] + " " + points[0][1];

    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const midY = (y0 + y1) / 2;
      const bow = (i % 2 ? 1 : -1) * sway;
      const lift = (y1 - y0) * 0.15;
      d += " C" + (x0 + bow) + " " + (midY - lift) + " " + (x1 + bow) + " " + (midY + lift) + " " + x1 + " " + y1;
    }

    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    trail.setAttribute("d", d);
    path.setAttribute("d", d);

    pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    updateProgress();
  }


  /* ---------------------------------------------------------------------------
     SCROLL PROGRESS
     The path is drawn up to 60% of the screen height; steps above that line
     are "active", steps within 88% of the screen are "seen".
     --------------------------------------------------------------------------- */
  function updateProgress() {
    const viewportHeight = innerHeight;
    const box = container.getBoundingClientRect();
    const progress = prefersReducedMotion
      ? 1
      : Math.min(1, Math.max(0, (viewportHeight * 0.6 - box.top) / box.height));

    path.style.strokeDashoffset = pathLength * (1 - progress);

    steps.forEach((step) => {
      const stepTop = step.getBoundingClientRect().top;
      const dotTop = step.querySelector(".journey-dot").getBoundingClientRect().top;

      if (prefersReducedMotion || stepTop < viewportHeight * 0.88) step.setAttribute("data-seen", "");

      if (prefersReducedMotion || dotTop < viewportHeight * 0.6) {
        step.setAttribute("data-active", "");
      } else {
        step.removeAttribute("data-active");
      }
    });
  }


  /* ---------------------------------------------------------------------------
     EVENT WIRING
     --------------------------------------------------------------------------- */
  let frameRequested = false;
  addEventListener(
    "scroll",
    () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(() => {
        updateProgress();
        frameRequested = false;
      });
    },
    { passive: true }
  );

  addEventListener("resize", buildPath);
  addEventListener("load", buildPath);
  if (window.ResizeObserver) new ResizeObserver(buildPath).observe(container);
  buildPath();
})();
