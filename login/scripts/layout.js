/* =============================================================================
   LOGIN + REGISTER – SHARED PAGE LAYOUT
   -----------------------------------------------------------------------------
   Loaded by both login/index.html and login/register.html (before the page's
   own form script).
     1. Fit the design canvas to the window (wide windows only)
     2. Theme switch + "Back to portal" link
   ============================================================================= */

(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);


  /* ---------------------------------------------------------------------------
     1. FIT THE DESIGN CANVAS TO THE WINDOW
     The design is drawn at 1697 × 927. On wide windows (the `canvas:` layout
     in styles/input.css) it is scaled so its height or width fits exactly,
     and the canvas is stretched in the other direction so it fills the
     window edge to edge – nothing is cropped and the page never scrolls.

     CSS variables set on #scene:
       --canvas-width / --canvas-height  the stretched canvas size
       --canvas-shift-left               extra room given to the left content
       --canvas-shift-right              extra room given to the card
       --canvas-offset-y                 vertical centring on tall windows
     --------------------------------------------------------------------------- */
  const DESIGN_WIDTH = 1697;
  const DESIGN_HEIGHT = 927;
  const CANVAS_LAYOUT = matchMedia("(min-width: 701px) and (min-aspect-ratio: 1/1)");

  const scene = $("#scene");
  const viewport = $("#viewport");

  function fitCanvas() {
    const style = scene.style;

    // Phones and upright windows: plain stacked layout, nothing to scale
    if (!CANVAS_LAYOUT.matches) {
      ["--canvas-width", "--canvas-height", "--canvas-shift-left", "--canvas-shift-right", "--canvas-offset-y"].forEach(
        (name) => style.removeProperty(name)
      );
      style.transform = "";
      viewport.style.height = "";
      return;
    }

    let scale;
    let canvasWidth = DESIGN_WIDTH;
    let canvasHeight = DESIGN_HEIGHT;

    if (innerWidth / innerHeight >= DESIGN_WIDTH / DESIGN_HEIGHT) {
      // Window wider than the design: fit the height, widen the canvas
      scale = innerHeight / DESIGN_HEIGHT;
      canvasWidth = innerWidth / scale;
    } else {
      // Window taller than the design: fit the width, heighten the canvas
      scale = innerWidth / DESIGN_WIDTH;
      canvasHeight = innerHeight / scale;
    }

    const extraWidth = canvasWidth - DESIGN_WIDTH;

    style.setProperty("--canvas-width", canvasWidth + "px");
    style.setProperty("--canvas-height", canvasHeight + "px");
    style.setProperty("--canvas-shift-left", extraWidth * 0.25 + "px");  // heading / stats move a little right
    style.setProperty("--canvas-shift-right", extraWidth * 0.75 + "px"); // card moves towards the right edge
    style.setProperty("--canvas-offset-y", (canvasHeight - DESIGN_HEIGHT) / 2 + "px");
    style.transform = "scale(" + scale + ")";
    viewport.style.height = innerHeight + "px";
  }

  addEventListener("resize", fitCanvas);
  CANVAS_LAYOUT.addEventListener("change", fitCanvas); // e.g. a tablet rotated between layouts
  fitCanvas();


  /* ---------------------------------------------------------------------------
     2. THEME SWITCH + "BACK TO PORTAL" LINK
     The link carries the current theme back to the portal.
     --------------------------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = $("#theme-toggle");
  const backLink = $("#back-to-portal");

  function syncThemeControls() {
    const isDark = root.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    backLink.href = backLink.href.split("?")[0] + "?theme=" + root.dataset.theme;
  }

  themeToggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("mpTheme", root.dataset.theme);
    } catch (error) {
      /* storage blocked: the switch still works for this visit */
    }
    syncThemeControls();
  });

  syncThemeControls();
})();
