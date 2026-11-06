/* =============================================================================
   INVESTOR DASHBOARD – BEHAVIOUR
   -----------------------------------------------------------------------------
   Shared by every dashboard page (index.html, profile.html); the application
   list part only runs where the table exists.
     1. Helpers
     2. Theme switch (+ keep the theme when logging out)
     3. Sidebar: open / close on small screens, "ITT for Identified Land" menu
     4. Application list: data, table rows, search, row action menu

   NOTE: everything here is front-end demo data. When the portal's back end is
   ready, load APPLICATIONS (and the numbers in the stat cards) from it.
   ============================================================================= */

(function () {
  "use strict";


  /* ---------------------------------------------------------------------------
     1. HELPERS
     --------------------------------------------------------------------------- */
  const $ = (selector) => document.querySelector(selector);
  const body = document.body;

  // Escape text before putting it into HTML
  const escapeHtml = (text) =>
    String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);


  /* ---------------------------------------------------------------------------
     2. THEME SWITCH
     The Logout link carries the theme back to the login page.
     --------------------------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = $("#theme-toggle");
  const logoutLink = $("#logout-link");

  function syncThemeControls() {
    const isDark = root.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    logoutLink.href = logoutLink.href.split("?")[0] + "?theme=" + root.dataset.theme;
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
     3. SIDEBAR
     --------------------------------------------------------------------------- */
  const openButton = $("#sidebar-open");
  const backdrop = $("#sidebar-backdrop");

  function setSidebarOpen(open) {
    body.toggleAttribute("data-sidebar-open", open);
    backdrop.classList.toggle("hidden", !open);
    openButton.setAttribute("aria-expanded", String(open));
  }

  openButton.addEventListener("click", () => setSidebarOpen(true));
  backdrop.addEventListener("click", () => setSidebarOpen(false));

  // "ITT for Identified Land" sub-menu
  const ittToggle = $("#itt-toggle");
  ittToggle.addEventListener("click", () => {
    const open = ittToggle.getAttribute("aria-expanded") === "true";
    ittToggle.setAttribute("aria-expanded", String(!open));
  });


  /* ---------------------------------------------------------------------------
     4. APPLICATION LIST
     --------------------------------------------------------------------------- */

  // Demo data – one entry per application
  const APPLICATIONS = [
    {
      type: "ITT – Identified Land",
      number: "MP-ITT_L26_0000026",
      date: "Nov 4, 2026",
      status: "Tender Finalized",
    },
  ];

  // Badge colours per status
  const STATUS_STYLES = {
    "Tender Finalized": "bg-[#E5F4E3] text-[#2F6B2A]",
    "Under Review": "bg-[#FDF0D9] text-[#C77A0A]",
    "Rejected": "bg-[#FBE3E1] text-[#8E2A21]",
  };

  const rows = $("#application-rows");
  const count = $("#application-count");
  const search = $("#application-search");

  function renderApplications() {
    const query = search.value.trim().toLowerCase();
    const visible = APPLICATIONS.filter((app) =>
      (app.number + " " + app.type).toLowerCase().includes(query)
    );

    rows.innerHTML = visible.length
      ? visible
          .map(
            (app, index) => `
        <tr class="border-b border-line text-[16px] sm:text-[17px]">
          <td class="px-6 py-4">
            <span class="flex items-center gap-4">
              <span class="grid size-10 place-items-center rounded-xl bg-soft text-primary">
                <svg class="icon size-6"><use href="#icon-mountain"/></svg>
              </span>
              ${escapeHtml(app.type)}
            </span>
          </td>
          <td class="px-4 py-4 font-medium">${escapeHtml(app.number)}</td>
          <td class="px-4 py-4">${escapeHtml(app.date)}</td>
          <td class="px-4 py-4">
            <span class="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[15px] font-semibold ${STATUS_STYLES[app.status] || "bg-soft"}">
              <svg class="icon size-5 rounded-full bg-[#2E8B3A] p-0.5 text-white [stroke-width:2.6]"><use href="#icon-check-circle"/></svg>
              ${escapeHtml(app.status)}
            </span>
          </td>
          <td class="relative px-6 py-4 text-right">
            <button type="button" class="row-menu-button grid size-10 place-items-center rounded-full hover:bg-soft ml-auto"
                    aria-label="Actions for ${escapeHtml(app.number)}" aria-haspopup="menu" aria-expanded="false" data-index="${index}">
              <svg class="icon size-6"><use href="#icon-dots"/></svg>
            </button>
            <div class="row-menu absolute right-6 top-14 z-10 w-48 rounded-2xl border border-line bg-surface p-1.5 text-left shadow-[0_16px_32px_rgb(47_26_16/.15)]" role="menu">
              <a class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] hover:bg-soft" href="#" role="menuitem">
                <svg class="icon size-5"><use href="#icon-eye"/></svg> View application
              </a>
              <a class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] hover:bg-soft" href="#" role="menuitem">
                <svg class="icon size-5"><use href="#icon-download"/></svg> Download receipt
              </a>
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr><td class="px-6 py-8 text-center text-muted" colspan="5">No applications match “${escapeHtml(search.value)}”.</td></tr>`;

    const noun = APPLICATIONS.length === 1 ? "application" : "applications";
    count.textContent = "Showing " + visible.length + " of " + APPLICATIONS.length + " " + noun;
  }

  // Only pages that have the application table (index.html) render it
  if (rows) {
    search.addEventListener("input", renderApplications);
    renderApplications();
  }

  // Row action menu (⋮): one open at a time; click elsewhere or Esc closes it
  function closeRowMenus() {
    document.querySelectorAll(".row-menu[data-open]").forEach((menu) => menu.removeAttribute("data-open"));
    document.querySelectorAll(".row-menu-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".row-menu-button");
    const wasOpen = button?.getAttribute("aria-expanded") === "true";
    closeRowMenus();

    if (button && !wasOpen) {
      button.nextElementSibling.setAttribute("data-open", "");
      button.setAttribute("aria-expanded", "true");
    }
  });

  addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRowMenus();
      setSidebarOpen(false);
    }
  });
})();
