// CHR Parking Landing Page - Individual Pages

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
let currentPage = 1;
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
  showPage(1);
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

  // Track manual changes
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

// Page navigation
function showPage(page) {
  // Hide all panels
  document.querySelectorAll(".page-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  // Show target panel
  document.getElementById(`page${page}`).classList.add("active");

  // Update progress bar
  document.querySelectorAll(".progress-step").forEach((el, index) => {
    el.classList.remove("active", "completed");
    if (index + 1 < page) {
      el.classList.add("completed");
    } else if (index + 1 === page) {
      el.classList.add("active");
    }
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });

  currentPage = page;
}

function nextPage(page) {
  // Validate before proceeding
  if (currentPage === 1) {
    const outDate = document.getElementById("outDate").value;
    if (!outDate) {
      alert("Please select a drop-off date");
      return;
    }
  }

  if (currentPage === 3) {
    const inDate = document.getElementById("inDate").value;
    const outDate = document.getElementById("outDate").value;
    if (!inDate) {
      alert("Please select a collection date");
      return;
    }
    if (new Date(inDate) < new Date(outDate)) {
      alert("Collection date must be on or after drop-off date");
      return;
    }
  }

  showPage(page);
}

function prevPage(page) {
  showPage(page);
}

// Flight selection
function skipFlight() {
  selectedFlight = null;
  updateSummary();
  showPage(6);
}

function selectFlight() {
  if (!departCode) {
    alert("Location parameter required for flight lookup. Continuing without flight...");
    skipFlight();
    return;
  }

  const modal = document.getElementById("flightModal");
  modal.classList.add("active");
  loadDestinations();
}

function closeFlightModal() {
  const modal = document.getElementById("flightModal");
  modal.classList.remove("active");

  // Reset to destination step
  document.getElementById("destinationStep").classList.add("active");
  document.getElementById("flightStep").classList.remove("active");
}

// Destinations API
async function loadDestinations() {
  const loading = document.getElementById("destinationLoading");
  const list = document.getElementById("destinationList");

  loading.style.display = "block";
  list.innerHTML = "";

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
    list.innerHTML = '<p style="text-align: center; color: #666;">Unable to load destinations.</p>';
  } finally {
    loading.style.display = "none";
  }
}

function renderDestinations() {
  const list = document.getElementById("destinationList");

  if (!availableDestinations || availableDestinations.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #666;">No destinations found for this date.</p>';
    return;
  }

  list.innerHTML = availableDestinations
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

  // Switch to flight step
  document.getElementById("destinationStep").classList.remove("active");
  document.getElementById("flightStep").classList.add("active");

  document.getElementById("flightStepTitle").textContent = `Flights to ${selectedDestination.city}`;

  loadFlightsForDestination(selectedDestination.airports);
}

function backToDestinations() {
  document.getElementById("flightStep").classList.remove("active");
  document.getElementById("destinationStep").classList.add("active");
}

// Flights API
async function loadFlightsForDestination(airportCodes) {
  if (!airportCodes || airportCodes.length === 0) return;

  const loading = document.getElementById("flightLoading");
  const list = document.getElementById("flightList");

  loading.style.display = "block";
  list.innerHTML = "";

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
    list.innerHTML = '<p style="text-align: center; color: #666;">Unable to load flights.</p>';
  } finally {
    loading.style.display = "none";
  }
}

function renderFlights(flights) {
  const list = document.getElementById("flightList");

  if (!flights || flights.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #666;">No flights found for this route and date.</p>';
    return;
  }

  list.innerHTML = flights
    .slice(0, 50)
    .map((f) => {
      const code = (f.flight && f.flight.code) || "";
      const airline = (f.flight && f.flight.carrier && f.flight.carrier.name) || "";
      const depTime = (f.departure && f.departure.time) || "";
      const arrTime = (f.arrival && f.arrival.time) || "";
      const depIata = (f.departure && f.departure.airport_iata) || "";
      const arrIata = (f.arrival && f.arrival.airport_iata) || "";

      return `
        <div class="flight-card" onclick='chooseFlightData(${JSON.stringify(f).replace(/'/g, "&#39;")})'>
          <div class="flight-code">${code}</div>
          ${airline ? `<div class="flight-airline">${airline}</div>` : ""}
          <div class="flight-times">${depIata} ${depTime} → ${arrIata} ${arrTime}</div>
        </div>
      `;
    })
    .join("");
}

function chooseFlightData(flightData) {
  selectedFlight = flightData;
  closeFlightModal();
  updateSummary();
  showPage(6);
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

  if (!outDate || !inDate) {
    alert("Please complete all required fields");
    return;
  }

  // URL params
  const urlParams = new URLSearchParams(window.location.search);
  const agent = urlParams.get("agent") || "WY992";
  const adcode = urlParams.get("adcode") || "";
  const promotionCode = urlParams.get("promotionCode") || "";
  const flightCode = selectedFlight ? ((selectedFlight.flight && selectedFlight.flight.code) || "default") : "default";

  // Encode times
  const outTimeEncoded = outTime.replace(":", "%3A");
  const inTimeEncoded = inTime.replace(":", "%3A");

  // Domain resolution (CHR stays on www)
  const host = window.location.host;
  const isLocal = host.startsWith("127") || host.includes("github.io");
  const basedomain = isLocal ? "www.holidayextras.com" : host;

  // Build search URL
  const searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${departCode}&terminal=&arrive=&flight=${flightCode}&in=${inDate}&out=${outDate}&park_from=${outTimeEncoded}&park_to=${inTimeEncoded}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=${adcode}&promotionCode=${promotionCode}`;

  window.location.href = searchUrl;
}
