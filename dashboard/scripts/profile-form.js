/* =============================================================================
   INVESTOR PROFILE FORM
   -----------------------------------------------------------------------------
   (Theme switch and sidebar come from scripts/dashboard.js.)
     1. Data: investor types, states, Madhya Pradesh districts
     2. Helpers: field errors
     3. Chosen track (from profile.html; saved with the profile)
     4. Investor type: note, labels, organisation fields
     5. PAN: format check + "Verify PAN" (demo)
     6. Address: state → district
     7. Save: validate, store, confirm
     8. Restore a saved profile

   DEMO ONLY: nothing is sent to a server. PAN "verification" only checks the
   format, and the profile is saved in this browser (localStorage).
   ============================================================================= */

(function () {
  "use strict";


  /* ---------------------------------------------------------------------------
     1. DATA
     --------------------------------------------------------------------------- */

  // Each investor type: the info note, which PAN holder letters fit (the 4th
  // character of a PAN: P person, F firm, C company, T trust, A association),
  // the labels to use, and which organisation fields are required.
  const INVESTOR_TYPES = {
    individual: {
      note: "Individual applies in personal capacity only. Investor Name, PAN, Mobile and Email are mandatory; organisation fields are not applicable.",
      panHolders: ["P"],
      nameLabel: "Name of Investor",
      entity: null,
    },
    proprietorship: {
      note: "A sole proprietorship applies through its proprietor: enter the proprietor's personal PAN and name, the firm's name and its GSTIN.",
      panHolders: ["P"],
      nameLabel: "Name of Proprietor",
      entity: { name: "Name of Firm", registration: "Udyam Registration Number", registrationRequired: false, gstinRequired: true },
    },
    partnership: {
      note: "Enter the firm's PAN and name, the partner authorised to apply, the firm registration number and GSTIN.",
      panHolders: ["F"],
      nameLabel: "Authorised Partner",
      entity: { name: "Name of Firm", registration: "Firm Registration Number", registrationRequired: true, gstinRequired: true },
    },
    llp: {
      note: "Enter the LLP's PAN and name, the designated partner authorised to apply, the LLPIN (e.g. AAB-1234) and GSTIN.",
      panHolders: ["F"],
      nameLabel: "Authorised Designated Partner",
      entity: { name: "Name of LLP", registration: "LLPIN", registrationRequired: true, gstinRequired: true, registrationPattern: /^[A-Z]{3}-\d{4}$/ },
    },
    company: {
      note: "Enter the company's PAN and name, the authorised signatory, the 21-character CIN and GSTIN.",
      panHolders: ["C"],
      nameLabel: "Authorised Signatory",
      entity: { name: "Name of Company", registration: "CIN", registrationRequired: true, gstinRequired: true, registrationPattern: /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/ },
    },
    trust: {
      note: "Enter the trust's or society's PAN and name, the office bearer authorised to apply and its registration number. GSTIN is optional.",
      panHolders: ["T", "A"],
      nameLabel: "Authorised Trustee / Office Bearer",
      entity: { name: "Name of Trust / Society", registration: "Registration Number", registrationRequired: true, gstinRequired: false },
    },
  };

  const STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
    "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
    "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal",
  ];

  // The 55 districts of Madhya Pradesh
  const MP_DISTRICTS = [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal",
    "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior",
    "Harda", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Maihar", "Mandla", "Mandsaur",
    "Mauganj", "Morena", "Narmadapuram", "Narsinghpur", "Neemuch", "Niwari", "Pandhurna", "Panna", "Raisen",
    "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur",
    "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha",
  ];

  // Valid tracks (chosen on profile.html)
  const TRACKS = {
    tender: { name: "Tender Based Application", amount: "Investment below ₹100 Cr", icon: "#icon-tender" },
    direct: { name: "Direct Investment Application", amount: "Investment above ₹100 Cr", icon: "#icon-invest" },
  };

  const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
  const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const PROFILE_KEY = "mpInvestorProfile";


  /* ---------------------------------------------------------------------------
     2. HELPERS: FIELD ERRORS
     Each field has a <p class="field-error" id="…-error"> under it.
     --------------------------------------------------------------------------- */
  const $ = (selector) => document.querySelector(selector);
  const form = $("#profile-form");
  const formStatus = $("#form-status");

  function setError(input, message) {
    const errorBox = document.getElementById(input.getAttribute("aria-describedby"));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (errorBox) errorBox.textContent = message || "";
  }

  // Typing in a field clears its error
  form.addEventListener("input", (event) => {
    if (event.target.matches(".field-input")) setError(event.target, "");
    formStatus.textContent = "";
  });


  /* ---------------------------------------------------------------------------
     3. CHOSEN TRACK
     "?track=" from profile.html, else the choice saved there.
     --------------------------------------------------------------------------- */
  let track = new URLSearchParams(location.search).get("track");
  if (!TRACKS[track]) {
    try {
      track = localStorage.getItem("mpProfileTrack");
    } catch (error) {
      track = null;
    }
  }
  if (!TRACKS[track]) track = "tender";


  /* ---------------------------------------------------------------------------
     4. INVESTOR TYPE
     --------------------------------------------------------------------------- */
  const typeSelect = $("#investor-type");
  const entityFields = [...document.querySelectorAll(".entity-field")];
  const entityNameInput = $("#entity-name");
  const registrationInput = $("#registration-number");
  const gstinInput = $("#gstin");

  function applyInvestorType() {
    const type = INVESTOR_TYPES[typeSelect.value];

    $("#type-note").textContent = type.note;
    $("#investor-name-label").textContent = type.nameLabel;

    // Organisation fields only for non-individuals
    entityFields.forEach((field) => {
      field.hidden = !type.entity;
    });

    if (type.entity) {
      $("#entity-name-label").textContent = type.entity.name;
      $("#registration-label").textContent = type.entity.registration;
      $("#registration-label").classList.toggle("is-required", type.entity.registrationRequired);
      document.querySelector('label[for="gstin"]').classList.toggle("is-required", type.entity.gstinRequired);
    }

    // The PAN must be checked again against the new type
    markPanUnverified();
    [entityNameInput, registrationInput, gstinInput].forEach((input) => setError(input, ""));
  }

  typeSelect.addEventListener("change", applyInvestorType);


  /* ---------------------------------------------------------------------------
     5. PAN
     Format: 5 letters, 4 digits, 1 letter. The 4th letter must fit the
     investor type. "Verify PAN" only checks this (demo).
     --------------------------------------------------------------------------- */
  const panInput = $("#pan");
  const panVerified = $("#pan-verified");
  let panIsVerified = false;

  function panProblem() {
    const pan = panInput.value.trim().toUpperCase();
    if (!pan) return "Enter the PAN.";
    if (!PAN_PATTERN.test(pan)) return "PAN must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g. ABCPE1234F).";

    const holders = INVESTOR_TYPES[typeSelect.value].panHolders;
    if (!holders.includes(pan[3])) {
      return "This PAN's 4th letter is " + pan[3] + ", but this investor type needs " + holders.join(" or ") + ".";
    }
    return "";
  }

  function markPanUnverified() {
    panIsVerified = false;
    panVerified.classList.add("hidden");
    panVerified.classList.remove("flex");
  }

  // Letters and digits only, upper case
  panInput.addEventListener("input", () => {
    panInput.value = panInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    markPanUnverified();
  });

  $("#verify-pan").addEventListener("click", () => {
    const problem = panProblem();
    setError(panInput, problem);
    if (problem) {
      panInput.focus();
      return;
    }
    // DEMO: a real portal verifies the PAN with the Income Tax / NSDL service
    panIsVerified = true;
    panVerified.classList.remove("hidden");
    panVerified.classList.add("flex");
  });


  /* ---------------------------------------------------------------------------
     6. ADDRESS: STATE → DISTRICT
     Madhya Pradesh gets a district list; other states type the district.
     --------------------------------------------------------------------------- */
  const stateSelect = $("#state");
  const districtSelect = $("#district");
  const districtText = $("#district-text");

  stateSelect.insertAdjacentHTML("beforeend", STATES.map((state) => `<option>${state}</option>`).join(""));

  function applyState() {
    const isMadhyaPradesh = stateSelect.value === "Madhya Pradesh";
    const chosen = Boolean(stateSelect.value);

    districtSelect.innerHTML =
      '<option value="">--Select--</option>' +
      (isMadhyaPradesh ? MP_DISTRICTS.map((district) => `<option>${district}</option>`).join("") : "");

    // Show the list for MP (or before a state is chosen), a text box otherwise
    districtSelect.hidden = chosen && !isMadhyaPradesh;
    districtSelect.disabled = !isMadhyaPradesh;
    districtText.hidden = !chosen || isMadhyaPradesh;
    setError(districtSelect, "");
    setError(districtText, "");
  }

  stateSelect.addEventListener("change", applyState);

  // Digits only for pincode and mobile
  ["#pincode", "#mobile"].forEach((selector) => {
    const input = $(selector);
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });
  });

  [registrationInput, gstinInput].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase();
    });
  });


  /* ---------------------------------------------------------------------------
     7. SAVE
     Check every field, show each problem under its field, then store.
     --------------------------------------------------------------------------- */
  function validate() {
    const type = INVESTOR_TYPES[typeSelect.value];
    const problems = [];
    const check = (input, message) => {
      setError(input, message);
      if (message) problems.push(input);
    };
    const value = (selector) => $(selector).value.trim();

    // PAN must be valid and verified
    const pan = panProblem();
    check(panInput, pan || (panIsVerified ? "" : "Press Verify PAN before saving."));

    check($("#investor-name"), value("#investor-name").length >= 3 ? "" : "Enter the full name.");

    if (type.entity) {
      check(entityNameInput, value("#entity-name") ? "" : "Enter the " + type.entity.name.toLowerCase() + ".");

      const registration = value("#registration-number");
      let registrationMessage = "";
      if (type.entity.registrationRequired && !registration) {
        registrationMessage = "Enter the " + type.entity.registration + ".";
      } else if (registration && type.entity.registrationPattern && !type.entity.registrationPattern.test(registration)) {
        registrationMessage = "This " + type.entity.registration + " doesn't look right.";
      }
      check(registrationInput, registrationMessage);

      const gstin = value("#gstin");
      let gstinMessage = "";
      if (type.entity.gstinRequired && !gstin) gstinMessage = "Enter the GSTIN.";
      else if (gstin && !GSTIN_PATTERN.test(gstin)) gstinMessage = "GSTIN must be 15 characters (e.g. 23ABCPE1234F1Z5).";
      check(gstinInput, gstinMessage);
    }

    check(stateSelect, stateSelect.value ? "" : "Select the state.");
    if (stateSelect.value === "Madhya Pradesh") {
      check(districtSelect, districtSelect.value ? "" : "Select the district.");
    } else if (stateSelect.value) {
      check(districtText, value("#district-text") ? "" : "Enter the district.");
    }

    check($("#pincode"), /^[1-9]\d{5}$/.test(value("#pincode")) ? "" : "Enter a valid 6-digit pincode.");
    check($("#address-1"), value("#address-1").length >= 5 ? "" : "Enter the address.");
    check($("#mobile"), /^[6-9]\d{9}$/.test(value("#mobile")) ? "" : "Enter a valid 10-digit mobile number.");
    check($("#email"), /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value("#email")) ? "" : "Enter a valid email address.");

    return problems;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const problems = validate();
    if (problems.length) {
      formStatus.className = "mr-auto text-[14px] font-semibold empty:hidden text-[#c5221f]";
      formStatus.textContent = "Please fix the highlighted field" + (problems.length > 1 ? "s" : "") + ".";
      problems[0].focus();
      return;
    }

    // DEMO: a real portal submits this to the server
    const profile = Object.fromEntries(new FormData(form));
    profile.track = track;
    profile.panVerified = true;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      /* storage blocked: nothing to remember */
    }

    formStatus.className = "mr-auto text-[14px] font-semibold empty:hidden text-[#2E8B3A]";
    formStatus.textContent = "Profile saved. You can now apply for tourism land parcels.";
  });


  /* ---------------------------------------------------------------------------
     8. RESTORE A SAVED PROFILE (so the investor can edit it later)
     --------------------------------------------------------------------------- */
  applyInvestorType();
  applyState();

  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (saved) {
      typeSelect.value = saved.investorType || "individual";
      applyInvestorType();
      stateSelect.value = saved.state || "";
      applyState();

      Object.entries(saved).forEach(([name, value]) => {
        const field = form.elements[name];
        if (field && name !== "investorType" && name !== "state") field.value = value;
      });

      if (saved.panVerified && !panProblem()) {
        panIsVerified = true;
        panVerified.classList.remove("hidden");
        panVerified.classList.add("flex");
      }
    }
  } catch (error) {
    /* nothing saved or storage blocked */
  }
})();
