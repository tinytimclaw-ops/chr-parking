// CHR Parking Landing Page JavaScript

// CHR brand mapping
const CHR_BRANDS = {
  LHR: { name: "Heathrow Parking", slug: "heathrowparking" },
  LGW: { name: "Gatwick Parking", slug: "gatwickparking" },
  MAN: { name: "Manchester Parking", slug: "manchesterairport" },
  STN: { name: "Stansted Parking", slug: "stanstedparking" },
  LTN: { name: "Luton Parking", slug: "lutonparking" },
  BHX: { name: "Birmingham Parking", slug: "birminghamairport" },
  EDI: { name: "Edinburgh Parking", slug: "edinburghairport" },
  BRS: { name: "Bristol Parking", slug: "bristolairport" },
  NCL: { name: "Newcastle Parking", slug: "newcastleairport" },
  LBA: { name: "Leeds Bradford Parking", slug: "leedsbradfordairport" },
};

const DEFAULT_BRAND = { name: "Airport Parking", slug: "heathrowparking" };

// State
let currentStep = 1;
let selectedDestination = null;
let selectedFlight = null;
let availableDestinations = [];
let departCode = "";
let brand = DEFAULT_BRAND;
let inDateManuallyChanged = false;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeBranding();
  initializeDates();
  initializeHashNavigation();
  setupDateListeners();
});

// Branding setup
function initializeBranding() {
  const urlParams = new URLSearchParams(window.location.search);
  departCode = (urlParams.get("Location") || urlParams.get("location") || "").toUpperCase();
  brand = CHR_BRANDS[departCode] || DEFAULT_BRAND;

  // Set brand name
  document.getElementById("brandName").textContent = brand.name;
  document.getElementById("footerBrand").textContent = brand.name;
  document.title = brand.name;

  // Set logo
  const logoUrl = `https://s3.amazonaws.com/theme-media/img/brand/${brand.slug}-icon.png`;
  const logoEl = document.getElementById("brandLogo");
  logoEl.src = logoUrl;
  logoEl.alt = brand.name;
  logoEl.onerror = () => {
    logoEl.src = "https://s3.amazonaws.com/theme-media/img/brand/heathrowparking-icon.png";
  };
}

// Date calculation helpers
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function defaultInFromOut(outDateStr) {
  const d = new Date(outDateStr);
  d.setDate(d.getDate() + 8);
  return d.toISOString().split("T")[0];
}

function initializeDates() {
  const outDateInput = document.getElementById("outDate");
  const inDateInput = document.getElementById("inDate");

  outDateInput.value = datePlus(1);
  inDateInput.value = datePlus(9);

  // Set min dates
  outDateInput.min = new Date().toISOString().split("T")[0];
  inDateInput.min = datePlus(1);
}

function setupDateListeners() {
  const outDateInput = document.getElementById("outDate");
  const inDateInput = document.getElementById("inDate");

  // Track manual changes to inDate
  inDateInput.addEventListener("change", () => {
    inDateManuallyChanged = true;
  });

  // Recalculate inDate when outDate changes (unless manually changed)
  outDateInput.addEventListener("change", () => {
    if (!inDateManuallyChanged) {
      inDateInput.value = defaultInFromOut(outDateInput.value);
    }
    // Update inDate minimum
    inDateInput.min = outDateInput.value;
  });
}

// Hash navigation
function initializeHashNavigation() {
  const hash = window.location.hash;
  if (hash) {
    const stepMatch = hash.match(/#step(\d)/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1]);
      if (step >= 1 && step <= 4) {
        goToStep(step);
      }
    }
  } else {
    window.location.hash = "#step1";
  }

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash;
    const stepMatch = hash.match(/#step(\d)/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1]);
      if (step >= 1 && step <= 4) {
        showStep(step);
      }
    }
  });
}

// Step navigation
function goToStep(step) {
  // Validation before proceeding
  if (step === 2 && currentStep === 1) {
    if (!validateDates()) {
      return;
    }
    loadDestinations();
  }

  if (step === 4 && currentStep === 3) {
    updateSummary();
  }

  window.location.hash = `#step${step}`;
}

function showStep(step) {
  // Hide all panels
  document.querySelectorAll(".step-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  // Show target panel
  document.getElementById(`step${step}`).classList.add("active");

  // Update progress bar
  document.querySelectorAll(".progress-step").forEach((el, index) => {
    el.classList.remove("active", "completed");
    if (index + 1 < step) {
      el.classList.add("completed");
    } else if (index + 1 === step) {
      el.classList.add("active");
    }
  });

  currentStep = step;
}

function skipToConfirm() {
  selectedDestination = null;
  selectedFlight = null;
  updateSummary();
  goToStep(4);
}

// Date validation
function validateDates() {
  const outDate = document.getElementById("outDate").value;
  const inDate = document.getElementById("inDate").value;

  if (!outDate || !inDate) {
    alert("Please select both drop-off and collection dates.");
    return false;
  }

  if (new Date(inDate) < new Date(outDate)) {
    alert("Collection date must be on or after drop-off date.");
    return false;
  }

  return true;
}

// Destinations API
async function loadDestinations() {
  if (!departCode) {
    document.getElementById("destinationList").innerHTML =
      '<p style="text-align: center; color: #666;">Location parameter required to load destinations. You can skip to search parking.</p>';
    return;
  }

  const destinationLoading = document.getElementById("destinationLoading");
  const destinationList = document.getElementById("destinationList");

  destinationLoading.style.display = "block";
  destinationList.innerHTML = "";

  try {
    const flightDate = document.getElementById("outDate").value;
    const apiUrl = `https://flight.dock-yard.io/destinations?location=${departCode}&departDate=${flightDate}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    availableDestinations = await response.json();
    renderDestinations();
  } catch (error) {
    console.error("Destinations lookup error:", error);
    destinationList.innerHTML = '<p style="text-align: center; color: #d9534f;">Unable to load destinations. Please try again or skip this step.</p>';
  } finally {
    destinationLoading.style.display = "none";
  }
}

function renderDestinations() {
  const destinationList = document.getElementById("destinationList");

  if (!availableDestinations || availableDestinations.length === 0) {
    destinationList.innerHTML = '<p style="text-align: center; color: #666;">No destinations found for this date.</p>';
    return;
  }

  destinationList.innerHTML = availableDestinations
    .map((dest, index) => `
      <div class="destination-card" onclick="selectDestination(${index})">
        <div class="destination-city">${dest.city || ""}</div>
        <div class="destination-country">${dest.country || ""}</div>
        <div class="destination-count">${dest.count || 0} flight${dest.count === 1 ? "" : "s"}</div>
      </div>
    `)
    .join("");
}

function selectDestination(index) {
  selectedDestination = availableDestinations[index];
  loadFlightsForDestination(selectedDestination.airports);
  goToStep(3);
}

// Flights API
async function loadFlightsForDestination(airportCodes) {
  if (!airportCodes || airportCodes.length === 0) return;

  if (!departCode) {
    document.getElementById("flightList").innerHTML =
      '<p style="text-align: center; color: #666;">Location parameter required for flight lookup.</p>';
    return;
  }

  const flightLoading = document.getElementById("flightLoading");
  const flightList = document.getElementById("flightList");
  const flightSubtitle = document.getElementById("flightSubtitle");

  flightLoading.style.display = "block";
  flightList.innerHTML = "";

  if (selectedDestination) {
    flightSubtitle.textContent = `Flights to ${selectedDestination.city}`;
  }

  try {
    const flightDate = document.getElementById("outDate").value;
    const destination = airportCodes.join(",");
    const apiUrl = `https://flight.dock-yard.io/searchDayFlights?location=${departCode}&destination=${destination}&departDate=${flightDate}&fullResults=true`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const flights = await response.json();
    renderFlights(flights);
  } catch (error) {
    console.error("Flight lookup error:", error);
    flightList.innerHTML = '<p style="text-align: center; color: #d9534f;">Unable to load flights. Please try again or skip this step.</p>';
  } finally {
    flightLoading.style.display = "none";
  }
}

function renderFlights(flights) {
  const flightList = document.getElementById("flightList");

  if (!flights || flights.length === 0) {
    flightList.innerHTML = '<p style="text-align: center; color: #666;">No flights found for this route and date.</p>';
    return;
  }

  flightList.innerHTML = flights
    .slice(0, 50) // Limit to first 50 flights
    .map((f, index) => {
      const code = (f.flight && f.flight.code) || "";
      const airline = (f.flight && f.flight.carrier && f.flight.carrier.name) || "";
      const depTime = (f.departure && f.departure.time) || "";
      const arrTime = (f.arrival && f.arrival.time) || "";
      const depIata = (f.departure && f.departure.airport_iata) || "";
      const arrIata = (f.arrival && f.arrival.airport_iata) || "";

      return `
        <div class="flight-card" onclick='selectFlight(${JSON.stringify(f).replace(/'/g, "&#39;")})'>
          <div class="flight-info">
            <div class="flight-code">${code}</div>
            ${airline ? `<div class="flight-airline">${airline}</div>` : ""}
            <div class="flight-times">
              ${depIata} ${depTime} <span class="flight-arrow">→</span> ${arrIata} ${arrTime}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function selectFlight(flightData) {
  selectedFlight = flightData;
  updateSummary();
  goToStep(4);
}

// Summary
function updateSummary() {
  const outDate = document.getElementById("outDate").value;
  const outTime = document.getElementById("outTime").value;
  const inDate = document.getElementById("inDate").value;
  const inTime = document.getElementById("inTime").value;

  const outDateFormatted = new Date(outDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const inDateFormatted = new Date(inDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  document.getElementById("summaryOutDate").textContent = `${outDateFormatted} at ${outTime}`;
  document.getElementById("summaryInDate").textContent = `${inDateFormatted} at ${inTime}`;

  const flightRow = document.getElementById("summaryFlightRow");
  const flightValue = document.getElementById("summaryFlight");

  if (selectedFlight) {
    const code = (selectedFlight.flight && selectedFlight.flight.code) || "";
    const airline = (selectedFlight.flight && selectedFlight.flight.carrier && selectedFlight.flight.carrier.name) || "";
    flightValue.textContent = airline ? `${code} (${airline})` : code;
    flightRow.style.display = "flex";
  } else {
    flightRow.style.display = "none";
  }
}

// Submit search
function submitSearch() {
  const outDate = document.getElementById("outDate").value;
  const outTime = document.getElementById("outTime").value;
  const inDate = document.getElementById("inDate").value;
  const inTime = document.getElementById("inTime").value;

  // URL params
  const urlParams = new URLSearchParams(window.location.search);
  const agent = urlParams.get("agent") || "WY992";
  const adcode = urlParams.get("adcode") || "";
  const promotionCode = urlParams.get("promotionCode") || "";
  const flightCode = selectedFlight ? ((selectedFlight.flight && selectedFlight.flight.code) || "default") : "default";

  // Encode times
  const outTimeEncoded = outTime.replace(":", "%3A");
  const inTimeEncoded = inTime.replace(":", "%3A");

  // Domain resolution
  const host = window.location.host;
  const isLocal = host.startsWith("127") || host.includes("github.io");
  const basedomain = isLocal ? "www.holidayextras.com" : host;

  // Build search URL
  const searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${departCode}&terminal=&arrive=&flight=${flightCode}&in=${inDate}&out=${outDate}&park_from=${outTimeEncoded}&park_to=${inTimeEncoded}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=${adcode}&promotionCode=${promotionCode}`;

  window.location.href = searchUrl;
}
