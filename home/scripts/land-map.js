/* =============================================================================
   LAND BANK – 3D MAP OF MADHYA PRADESH
   -----------------------------------------------------------------------------
   A CSS 3D model (no WebGL). The state is a stack of thin "slabs" cut to the
   state outline; pins stand on the surface and always face the viewer.

   What this file does:
     1. Parcel data          – the parcels and where they are (lat / lon).
     2. Build the model      – slabs and pins.
     3. Camera               – rotation, tilt, zoom and pan, eased every frame.
     4. Filters, list, panel – chips, search, the list and the details panel.
     5. Input                – drag to rotate, zoom buttons, clicks.

   Styles: home/styles/input.css, section 5.7.
   ============================================================================= */

(function () {
  "use strict";

  const viewport = document.getElementById("map-viewport");
  if (!viewport) return;

  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ---------------------------------------------------------------------------
     1. PARCEL DATA
     status: "open" = Open for intentions, "tender" = Tender open.
     To add a parcel, add an object here – the map, list and filters update.
     --------------------------------------------------------------------------- */
  const PARCELS = [
    {
      id: "orchha",
      name: "Raja Mahal Annexe Heritage Site",
      place: "Orchha, Niwari",
      khasra: "112/1, 112/2",
      lat: 25.35,
      lon: 78.64,
      status: "open",
      category: "Heritage property",
      area: "2.40 ha",
      reserve: "₹6.8 Cr",
      lease: "90 yrs",
      image: "assets/img/banner-3.jpg",
    },
    {
      id: "khajuraho",
      name: "Khajuraho Western Group Resort Plot",
      place: "Khajuraho, Chhatarpur",
      khasra: "845, 846",
      lat: 24.85,
      lon: 79.93,
      status: "tender",
      category: "Land parcel",
      area: "4.10 ha",
      reserve: "₹11.2 Cr",
      lease: "90 yrs",
      image: "assets/img/brand/hero-banner.jpg",
    },
    {
      id: "pachmarhi",
      name: "Pachmarhi Forest Edge Eco-Lodge Site",
      place: "Pachmarhi, Narmadapuram",
      khasra: "27/3",
      lat: 22.47,
      lon: 78.43,
      status: "open",
      category: "Eco / adventure",
      area: "1.85 ha",
      reserve: "₹4.3 Cr",
      lease: "60 yrs",
      image: "assets/img/opportunities/TourismSector5.jpg",
    },
    {
      id: "hanuwantiya",
      name: "Hanuwantiya Island Water Sports Hub",
      place: "Hanuwantiya, Khandwa",
      khasra: "14, 15, 16",
      lat: 22.26,
      lon: 76.68,
      status: "open",
      category: "Water tourism",
      area: "5.50 ha",
      reserve: "₹9 Cr",
      lease: "30 yrs",
      image: "assets/img/projects/featured-4.jpg",
    },
    {
      id: "bandhavgarh",
      name: "Bandhavgarh Buffer Wildlife Lodge",
      place: "Tala, Umaria",
      khasra: "76/2",
      lat: 23.7,
      lon: 81.02,
      status: "tender",
      category: "Eco / adventure",
      area: "2.75 ha",
      reserve: "₹5.6 Cr",
      lease: "60 yrs",
      image: "assets/img/projects/featured-3.jpg",
    },
    {
      id: "sanchi",
      name: "Sanchi Stupa Wayside Amenity",
      place: "Sanchi, Raisen",
      khasra: "210",
      lat: 23.48,
      lon: 77.74,
      status: "open",
      category: "Wayside amenity",
      area: "0.80 ha",
      reserve: "₹1.4 Cr",
      lease: "30 yrs",
      image: "assets/img/banner-4.jpg",
    },
  ];

  const STATUS_LABELS = {
    open: "Open for intentions",
    tender: "Tender open",
  };

  // Geographic extent of the state outline image (assets/map/mp-map.png)
  const MAP_BOUNDS = { west: 74.03, east: 82.82, south: 21.07, north: 26.87 };

  // Convert each parcel's lat / lon into a 0–1 position on the map
  PARCELS.forEach((parcel) => {
    parcel.x = (parcel.lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west);
    parcel.y = (MAP_BOUNDS.north - parcel.lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south);
  });


  /* ---------------------------------------------------------------------------
     ELEMENTS + STATE
     --------------------------------------------------------------------------- */
  const stage = document.getElementById("map-stage");
  const surface = document.getElementById("map-surface");
  const compass = document.getElementById("map-compass");
  const panel = document.getElementById("map-panel");
  const list = document.getElementById("map-list");
  const filters = document.getElementById("map-filters");
  const search = document.getElementById("map-search");
  const controls = document.getElementById("map-controls");

  let activeFilter = "all";   // "all" | "open" | "tender"
  let selectedId = null;      // id of the parcel shown in the panel
  let drag = null;            // pointer drag in progress
  let idle = true;            // gently sway the map while nobody touches it
  let lastInputTime = 0;

  // Escape text before putting it into HTML
  const escapeHtml = (text) =>
    String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

  function markInteraction() {
    idle = false;
    lastInputTime = performance.now();
  }


  /* ---------------------------------------------------------------------------
     2. BUILD THE MODEL
     --------------------------------------------------------------------------- */

  // Slabs: 14 copies of the outline stacked downwards, each a little darker,
  // which gives the state its thickness.
  for (let layer = 13; layer >= 0; layer--) {
    const slab = document.createElement("div");
    slab.className = "map-slab";
    slab.style.transform = "translateZ(" + -(layer + 1) * 1.6 + "px)";
    slab.style.background = "hsl(" + (30 + layer * 0.4) + " " + (34 - layer) + "% " + (70 - layer * 2.4) + "%)";
    stage.insertBefore(slab, surface);
  }

  // Pins: a pulsing base on the map, plus a "billboard" (stem, head, label)
  // that the camera code counter-rotates so it always faces the viewer.
  const PIN_ICON = '<svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V10l7-5 7 5v10M10 20v-5h4v5"/></svg>';
  const billboards = [];

  const pins = PARCELS.map((parcel) => {
    const pin = document.createElement("div");
    pin.className = "map-pin" + (parcel.status === "tender" ? " map-pin--tender" : "");
    pin.style.left = parcel.x * 100 + "%";
    pin.style.top = parcel.y * 100 + "%";
    pin.innerHTML = `
      <span class="map-pin-base"></span>
      <div class="map-pin-billboard">
        <span class="map-pin-stem"></span>
        <button type="button" class="map-pin-head" aria-label="${escapeHtml(parcel.name)}">${PIN_ICON}</button>
        <span class="map-pin-label">${escapeHtml(parcel.place.split(",")[0])}</span>
      </div>`;

    pin.querySelector("button").addEventListener("click", (event) => {
      event.stopPropagation();
      openParcel(parcel.id);
    });

    billboards.push(pin.querySelector(".map-pin-billboard"));
    stage.appendChild(pin);
    return pin;
  });


  /* ---------------------------------------------------------------------------
     3. CAMERA
     "target" is where the camera should be; "camera" eases 9% of the way
     there every frame, which makes every move smooth.
       rotation – turn around the vertical axis (degrees)
       tilt     – how far the map leans back (degrees)
       zoom     – scale
       panX/Y   – offset as a fraction of the map size
     --------------------------------------------------------------------------- */
  const HOME_VIEW = { rotation: -8, tilt: 52, zoom: 1, panX: 0, panY: 0 };
  const camera = { ...HOME_VIEW };
  const target = { ...HOME_VIEW };

  // Size the model to the viewport width
  function fitToViewport() {
    const width = viewport.clientWidth;
    stage.style.setProperty("--map-width", Math.min(860, width * (width < 640 ? 0.82 : 0.86)) + "px");
  }

  function renderFrame() {
    for (const key in camera) {
      camera[key] += (target[key] - camera[key]) * 0.09;
    }

    // Slow sway while idle
    const sway = idle && !prefersReducedMotion ? Math.sin(performance.now() / 2600) * 4 : 0;
    const rotation = camera.rotation + sway;

    stage.style.transform =
      "rotateX(" + camera.tilt + "deg) " +
      "rotateZ(" + rotation + "deg) " +
      "scale(" + camera.zoom + ") " +
      "translate(" + camera.panX * stage.offsetWidth + "px," + camera.panY * stage.offsetHeight + "px)";

    // Undo the map's rotation on each pin so it stands upright and faces us
    const facing = "rotateZ(" + -rotation + "deg) rotateX(" + -camera.tilt + "deg) scale(" + 1 / Math.sqrt(camera.zoom) + ")";
    billboards.forEach((billboard) => {
      billboard.style.transform = facing;
    });

    // Move the surface highlight and turn the compass with the map
    surface.style.setProperty("--light-x", 30 + Math.sin(rotation / 30) * 20 + "%");
    compass.style.transform = "rotate(" + rotation + "deg)";

    // Resume swaying 6 s after the last interaction (unless a parcel is open)
    if (performance.now() - lastInputTime > 6000 && !selectedId) idle = true;

    requestAnimationFrame(renderFrame);
  }

  // Fly to a point on the map (x, y in 0–1). shiftLeft keeps it clear of the panel.
  function flyTo(x, y, zoom, shiftLeft = 0) {
    Object.assign(target, {
      panX: 0.5 - x - shiftLeft / zoom,
      panY: 0.5 - y,
      zoom: zoom,
      tilt: 48,
    });
    markInteraction();
  }


  /* ---------------------------------------------------------------------------
     4. FILTERS, LIST AND DETAILS PANEL
     --------------------------------------------------------------------------- */
  function matchesFilters(parcel) {
    const query = search.value.trim().toLowerCase();
    const statusMatches = activeFilter === "all" || parcel.status === activeFilter;
    const textMatches =
      !query ||
      (parcel.name + " " + parcel.place + " " + parcel.category + " " + parcel.khasra).toLowerCase().includes(query);
    return statusMatches && textMatches;
  }

  // Redraw chips, list and pin states from the current filter / selection
  function render() {
    // Filter chips with counts
    const chipOptions = [
      ["all", "All parcels"],
      ["open", STATUS_LABELS.open],
      ["tender", STATUS_LABELS.tender],
    ];

    filters.innerHTML = chipOptions
      .map(([value, label]) => {
        const count = PARCELS.filter((parcel) => value === "all" || parcel.status === value).length;
        const dot = value === "all" ? "" : `<i class="status-dot ${value === "tender" ? "status-dot--tender" : ""}"></i>`;
        return `
          <button type="button" class="map-chip" data-filter="${value}" aria-pressed="${activeFilter === value}">
            ${dot}${label}<small class="opacity-60 tracking-normal">${count}</small>
          </button>`;
      })
      .join("");

    // Parcel list, grouped by status
    const visible = PARCELS.filter(matchesFilters);

    const groups = Object.entries(STATUS_LABELS)
      .map(([status, label]) => {
        const parcels = visible.filter((parcel) => parcel.status === status);
        if (!parcels.length) return "";

        const rows = parcels
          .map(
            (parcel) => `
            <button type="button" class="map-item flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-left transition-colors"
                    data-id="${parcel.id}" aria-current="${selectedId === parcel.id}">
              <img class="flex-none size-[52px] rounded-[10px] object-cover" src="${parcel.image}" alt="" loading="lazy">
              <span>
                <b class="block font-serif text-lg font-medium leading-[1.1]">${escapeHtml(parcel.name)}</b>
                <small class="block mt-0.5 text-xs text-muted">${escapeHtml(parcel.place)} · ${parcel.area}</small>
              </span>
            </button>`
          )
          .join("");

        return `<h4 class="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-medium tracking-[.24em] uppercase text-accent">${label}</h4>${rows}`;
      })
      .join("");

    list.innerHTML = groups || '<p class="px-2.5 py-3.5 text-sm text-muted">No parcels match.</p>';

    // Fade out pins that don't match; mark the selected one
    pins.forEach((pin, index) => {
      const parcel = PARCELS[index];
      pin.toggleAttribute("data-filtered-out", !matchesFilters(parcel));
      pin.toggleAttribute("data-selected", parcel.id === selectedId);
    });
  }

  // Select a parcel: fly to it and show the details panel
  function openParcel(id) {
    const parcel = PARCELS.find((item) => item.id === id);
    if (!parcel) return;

    selectedId = id;
    idle = false;
    flyTo(parcel.x, parcel.y, 2.1, viewport.clientWidth > 700 ? 0.2 : 0);

    const isTender = parcel.status === "tender";
    panel.innerHTML = `
      <div class="on-dark relative aspect-[16/10] overflow-hidden">
        <img class="size-full object-cover" src="${parcel.image}" alt="${escapeHtml(parcel.name)}">
        <div class="absolute inset-0 bg-linear-to-b from-transparent from-50% to-night/60"></div>
        <span class="absolute left-3.5 top-3.5 z-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-night/55 backdrop-blur-sm text-[10.5px] tracking-[.18em] uppercase">
          <i class="status-dot ${isTender ? "status-dot--tender" : ""}"></i>${STATUS_LABELS[parcel.status]}
        </span>
        <span class="absolute left-4 bottom-3 z-2 text-[11px] tracking-[.22em] uppercase text-accent-soft">${parcel.category}</span>
        <button type="button" class="absolute right-3 top-3 z-2 size-[34px] rounded-full bg-white/92 text-lg leading-none text-[#1E1416]" data-close aria-label="Close">×</button>
      </div>
      <div class="px-5 pt-[18px] pb-5">
        <h3 class="font-serif text-[26px] font-medium leading-[1.08]">${escapeHtml(parcel.name)}</h3>
        <p class="mt-1.5 text-[13px] text-muted">${escapeHtml(parcel.place)} · Khasra ${parcel.khasra}</p>
        <div class="grid grid-cols-3 mt-4 pt-3 border-t border-line text-[11px] tracking-[.16em] uppercase text-muted">
          <div><b class="block font-serif text-[22px] font-normal normal-case tracking-normal text-ink">${parcel.area}</b>Area</div>
          <div><b class="block font-serif text-[22px] font-normal normal-case tracking-normal text-ink">${parcel.reserve}</b>Reserve</div>
          <div><b class="block font-serif text-[22px] font-normal normal-case tracking-normal text-ink">${parcel.lease}</b>Lease</div>
        </div>
        <a class="btn btn-primary w-full justify-center mt-[18px] px-[22px] py-[13px] text-[11.5px]" href="#help">
          ${isTender ? "View tender" : "Submit intention"}
          <svg class="icon"><use href="#icon-arrow"/></svg>
        </a>
      </div>`;

    panel.querySelector("[data-close]").addEventListener("click", closePanel);
    panel.setAttribute("data-open", "");
    panel.setAttribute("aria-hidden", "false");

    render();
    list.querySelector('[data-id="' + id + '"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function closePanel() {
    selectedId = null;
    panel.removeAttribute("data-open");
    panel.setAttribute("aria-hidden", "true");
    flyTo(0.5, 0.5, 1);
    render();
  }

  // Back to the starting view, with no filter or search
  function resetView() {
    search.value = "";
    activeFilter = "all";
    selectedId = null;
    panel.removeAttribute("data-open");
    panel.setAttribute("aria-hidden", "true");
    Object.assign(target, HOME_VIEW);
    render();
  }


  /* ---------------------------------------------------------------------------
     5. INPUT
     --------------------------------------------------------------------------- */

  // Filter chips
  filters.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;

    activeFilter = chip.dataset.filter;
    const selected = PARCELS.find((parcel) => parcel.id === selectedId);

    if (selected && !matchesFilters(selected)) {
      closePanel(); // the open parcel is now filtered out
    } else {
      render();
    }
  });

  // List rows
  list.addEventListener("click", (event) => {
    const row = event.target.closest(".map-item");
    if (row) openParcel(row.dataset.id);
  });

  // Search: if exactly one parcel matches, open it
  search.addEventListener("input", () => {
    render();
    const matches = PARCELS.filter(matchesFilters);
    if (search.value.trim() && matches.length === 1) openParcel(matches[0].id);
  });

  // Zoom + reset buttons
  controls.addEventListener("click", (event) => {
    const action = event.target.closest("[data-zoom]")?.dataset.zoom;
    if (!action) return;

    if (action === "in") target.zoom = Math.min(3, target.zoom * 1.3);
    if (action === "out") target.zoom = Math.max(0.7, target.zoom / 1.3);
    if (action === "reset") resetView();

    markInteraction();
  });

  // Drag to rotate (sideways) and, with a mouse, tilt (up / down)
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("#map-panel, #map-controls, .map-pin-head")) return;

    drag = { x: event.clientX, y: event.clientY, rotation: target.rotation, tilt: target.tilt };
    viewport.setPointerCapture(event.pointerId);
    viewport.setAttribute("data-dragging", "");
    markInteraction();
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!drag) return;

    target.rotation = drag.rotation + (event.clientX - drag.x) * 0.3;
    if (event.pointerType === "mouse") {
      target.tilt = Math.max(15, Math.min(68, drag.tilt - (event.clientY - drag.y) * 0.25));
    }
    markInteraction();
  });

  function endDrag() {
    drag = null;
    viewport.removeAttribute("data-dragging");
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);


  /* ---------------------------------------------------------------------------
     START
     --------------------------------------------------------------------------- */
  addEventListener("resize", fitToViewport);
  fitToViewport();
  render();
  requestAnimationFrame(renderFrame);
})();
