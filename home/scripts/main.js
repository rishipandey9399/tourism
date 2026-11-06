/* =============================================================================
   HERITAGE CAPITAL – PAGE BEHAVIOUR
   -----------------------------------------------------------------------------
   Sections (in page order):
     1. Helpers
     2. Theme switch + Login link
     3. Preloader
     4. Header + full-screen menu
     5. Scroll reveals + counting figures
     6. Scroll-driven effects (header state, hero shrink, active nav link)
     7. Investment sectors (photo swap)
     8. Lightbox for the "Why invest" mosaic
     9. Custom cursor + magnetic buttons
    10. Pause the hero video when it is off screen

   The five-step journey and the 3D map live in their own files
   (scripts/journey.js, scripts/land-map.js).
   ============================================================================= */

(function () {
  "use strict";


  /* ---------------------------------------------------------------------------
     1. HELPERS
     --------------------------------------------------------------------------- */
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Respect the visitor's "reduce motion" setting
  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // True for a real mouse (not touch screens)
  const hasFinePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Set or remove a boolean data attribute, e.g. setFlag(el, "open", true) → data-open=""
  const setFlag = (element, name, on) => {
    if (on) {
      element.setAttribute("data-" + name, "");
    } else {
      element.removeAttribute("data-" + name);
    }
  };

  const body = document.body;


  /* ---------------------------------------------------------------------------
     2. THEME SWITCH + LOGIN LINK
     The theme is stored on <html data-theme="dark|light"> (set first thing in
     index.html). The Login link carries the theme to the login page.
     --------------------------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = $("#theme-toggle");
  const loginLink = $("#login-link");

  function syncThemeControls() {
    const isDark = root.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    loginLink.href = loginLink.href.split("?")[0] + "?theme=" + root.dataset.theme;
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


  /* ---------------------------------------------------------------------------
     3. PRELOADER
     Counts to 92 over 1.6s, then to 100 once the page has loaded (or after
     3.5s at most). Then the halves split open and the hero animates in.
     --------------------------------------------------------------------------- */
  (function runPreloader() {
    const preloader = $("#preloader");
    const counter = $("#preloader-count");
    const bar = $("#preloader-bar");
    const startTime = performance.now();
    let pageLoaded = false;

    addEventListener("load", () => {
      pageLoaded = true;
    });

    function step() {
      const elapsed = performance.now() - startTime;
      const finished = elapsed > 3500 || (pageLoaded && elapsed > 1600);
      const progress = finished ? 100 : Math.min(92, (elapsed / 1600) * 92);

      counter.textContent = Math.round(progress);
      bar.style.transform = "scaleX(" + progress / 100 + ")";

      if (progress < 100) {
        setTimeout(step, 24);
        return;
      }

      // Open the page
      setTimeout(() => {
        setFlag(preloader, "done", true);
        setFlag(body, "locked", false);
        setFlag(body, "ready", true); // starts the hero video zoom + intro fade
        $$("#hero-heading .line-mask").forEach((line) => line.classList.add("is-visible"));
        setTimeout(() => preloader.remove(), 1400);
      }, 250);
    }

    step();
  })();


  /* ---------------------------------------------------------------------------
     4. HEADER + FULL-SCREEN MENU
     --------------------------------------------------------------------------- */
  const header = $("#site-header");
  const menuButton = $("#menu-button");
  const menuPhoto = $("#menu-photo");

  function setMenuOpen(open) {
    setFlag(body, "menu-open", open);
    setFlag(body, "locked", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  menuButton.addEventListener("click", () => {
    setMenuOpen(!body.hasAttribute("data-menu-open"));
  });

  // Cross-fade a new photo into a container (used by the menu and the sectors)
  function crossfadePhoto(container, src) {
    const image = new Image();
    image.src = src;
    image.alt = "";
    image.className = "crossfade-img";
    container.appendChild(image);

    // Two frames so the browser registers the start state before fading in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => image.classList.add("is-active"));
    });

    // Keep only the last two photos
    [...container.children].slice(0, -2).forEach((old) => old.remove());
  }

  $$(".menu-link").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
    link.addEventListener("mouseenter", () => crossfadePhoto(menuPhoto, link.dataset.image));
  });


  /* ---------------------------------------------------------------------------
     5. SCROLL REVEALS + COUNTING FIGURES
     Anything with .reveal fades up when it enters the screen. Numbers with
     data-count count up from 0. Mosaic tiles (.tile-reveal) wipe in one by one.
     --------------------------------------------------------------------------- */
  function countUp(element) {
    const target = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals || 0);
    const duration = 1800;
    const startTime = performance.now();

    const format = (value) =>
      decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-IN");

    if (prefersReducedMotion) {
      element.textContent = format(target);
      return;
    }

    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      element.textContent = format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const element = entry.target;
        element.classList.add("is-visible");
        element.querySelectorAll("[data-count]").forEach(countUp);

        // Mosaic: reveal its tiles one after another
        element.querySelectorAll(".tile-reveal").forEach((tile, index) => {
          setTimeout(() => tile.classList.add("is-visible"), index * 120);
        });

        revealObserver.unobserve(element);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
  );

  // Clipped tiles report no visible area, so the mosaic itself is watched
  $$(".reveal, #mosaic").forEach((element) => revealObserver.observe(element));


  /* ---------------------------------------------------------------------------
     6. SCROLL-DRIVEN EFFECTS (one animation frame per scroll)
       • header turns solid after 60% of the first screen
       • header hides while scrolling down, shows while scrolling up
       • hero video shrinks into a rounded card
       • the nav link of the section in view is highlighted
     --------------------------------------------------------------------------- */
  const heroFrame = $("#hero-frame");
  const navLinks = $$(".nav-link");
  const sectionIds = ["landbank", "sectors", "process", "why", "help"];
  let lastScrollY = 0;

  function onScrollFrame() {
    const y = scrollY;
    const viewportHeight = innerHeight;

    // Header state
    const scrollingDown = y > lastScrollY;
    setFlag(header, "solid", y > viewportHeight * 0.6);
    setFlag(header, "hidden", scrollingDown && y > viewportHeight && !body.hasAttribute("data-menu-open"));
    lastScrollY = y;

    // Hero shrink (0 at the top → 1 after one screen)
    if (!prefersReducedMotion) {
      const progress = clamp(y / viewportHeight, 0, 1);
      heroFrame.style.transform = "scale(" + (1 - progress * 0.12) + ") translateY(" + progress * 6 + "vh)";
      heroFrame.style.borderRadius = 24 + progress * 8 + "px"; // rounded at rest, a little more as it shrinks
      heroFrame.style.opacity = 1 - progress * 0.5;
    }

    // Active nav link: the section crossing the middle of the screen
    let currentId = null;
    sectionIds.forEach((id) => {
      const box = document.getElementById(id).getBoundingClientRect();
      if (box.top < viewportHeight * 0.5 && box.bottom > viewportHeight * 0.5) currentId = id;
    });
    navLinks.forEach((link) => setFlag(link, "active", link.getAttribute("href") === "#" + currentId));
  }

  let frameRequested = false;
  addEventListener(
    "scroll",
    () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(() => {
        onScrollFrame();
        frameRequested = false;
      });
    },
    { passive: true }
  );
  addEventListener("resize", onScrollFrame);
  onScrollFrame();


  /* ---------------------------------------------------------------------------
     7. INVESTMENT SECTORS
     Hover (mouse) or tap a sector to open it and swap the photo.
     --------------------------------------------------------------------------- */
  const sectorPhoto = $("#sector-photo");
  const sectors = $$(".sector");

  sectors.forEach((sector) => {
    function select() {
      if (sector.getAttribute("aria-expanded") === "true") return;
      sectors.forEach((other) => other.setAttribute("aria-expanded", String(other === sector)));
      crossfadePhoto(sectorPhoto, sector.dataset.image);
    }

    sector.addEventListener("mouseenter", select);
    sector.addEventListener("click", select);
  });


  /* ---------------------------------------------------------------------------
     8. LIGHTBOX for the "Why invest" mosaic
     Click / Enter on a tile opens it; arrows and ← → keys move; Esc closes.
     --------------------------------------------------------------------------- */
  const tiles = $$("#mosaic .tile");
  const lightbox = $("#lightbox");
  const lightboxImage = $("#lightbox-image");
  const lightboxCaption = $("#lightbox-caption");
  let currentTile = 0;

  function openLightbox(index) {
    currentTile = (index + tiles.length) % tiles.length; // wrap around
    const tile = tiles[currentTile];
    const image = tile.querySelector("img");

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent =
      tile.querySelector("figcaption b").textContent + " · " + tile.querySelector("figcaption span").textContent;

    setFlag(lightbox, "open", true);
    setFlag(body, "locked", true);
  }

  function closeLightbox() {
    setFlag(lightbox, "open", false);
    if (!body.hasAttribute("data-menu-open")) setFlag(body, "locked", false);
  }

  tiles.forEach((tile, index) => {
    tile.addEventListener("click", () => openLightbox(index));
    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openLightbox(index);
    });
  });

  $("#lightbox-close").addEventListener("click", closeLightbox);
  $("#lightbox-prev").addEventListener("click", () => openLightbox(currentTile - 1));
  $("#lightbox-next").addEventListener("click", () => openLightbox(currentTile + 1));

  // Clicking the dark backdrop closes it
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  // Keyboard: Esc closes the menu and the lightbox; arrows browse photos
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
      closeLightbox();
      return;
    }
    if (!lightbox.hasAttribute("data-open")) return;
    if (event.key === "ArrowRight") openLightbox(currentTile + 1);
    if (event.key === "ArrowLeft") openLightbox(currentTile - 1);
  });


  /* ---------------------------------------------------------------------------
     9. CUSTOM CURSOR + MAGNETIC BUTTONS (mouse only)
     The ring eases towards the pointer and grows with a label over elements
     that have data-cursor. Buttons with data-magnetic lean towards the pointer.
     --------------------------------------------------------------------------- */
  const cursor = $("#cursor");

  if (hasFinePointer && !prefersReducedMotion) {
    const cursorLabel = $("#cursor-label");
    let pointerX = innerWidth / 2;
    let pointerY = innerHeight / 2;
    let cursorX = pointerX;
    let cursorY = pointerY;

    addEventListener(
      "mousemove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
      },
      { passive: true }
    );

    (function followPointer() {
      cursorX += (pointerX - cursorX) * 0.2;
      cursorY += (pointerY - cursorY) * 0.2;
      cursor.style.transform = "translate(" + cursorX + "px," + cursorY + "px)";
      requestAnimationFrame(followPointer);
    })();

    $$("[data-cursor]").forEach((element) => {
      element.addEventListener("mouseenter", () => {
        cursorLabel.textContent = element.dataset.cursor;
        setFlag(cursor, "big", true);
      });
      element.addEventListener("mouseleave", () => setFlag(cursor, "big", false));
    });

    $$("[data-magnetic]").forEach((button) => {
      button.addEventListener("mousemove", (event) => {
        const box = button.getBoundingClientRect();
        const offsetX = (event.clientX - box.left - box.width / 2) * 0.25;
        const offsetY = (event.clientY - box.top - box.height / 2) * 0.35;
        button.style.transform = "translate(" + offsetX + "px," + offsetY + "px)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.transform = "";
      });
    });
  } else {
    cursor.remove();
  }


  /* ---------------------------------------------------------------------------
     10. PAUSE THE HERO VIDEO WHEN IT IS OFF SCREEN (saves battery / CPU)
     --------------------------------------------------------------------------- */
  const heroVideo = $(".hero-video");

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      heroVideo.play().catch(() => {});
    } else {
      heroVideo.pause();
    }
  }).observe(heroFrame);
})();
