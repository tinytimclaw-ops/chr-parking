// CHR Crazy Parking - Interactive Data Collection

// CHR Brand Map
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
  LBA: { name: "Leeds Bradford Parking", slug: "leedsbradfordairport" }
};

const DEFAULT_BRAND = { name: "Airport Parking", slug: "heathrowparking" };

// State
const state = {
  currentStep: 1,
  outDate: null,
  outTime: "06%3A00",
  inDate: null,
  inTime: "12%3A00",
  dates: [],
  returnDates: [],
  currentDateIndex: 0,
  currentReturnDateIndex: 0
};

// Date helpers
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDayName(date) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

function getMonthName(date) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const depart = (urlParams.get("Location") || urlParams.get("location") || "").toUpperCase();
  const brand = CHR_BRANDS[depart] || DEFAULT_BRAND;

  // Set brand
  document.title = brand.name;
  document.getElementById('bannerHeadline').textContent = `Park your car in the future at ${brand.name}!`;
  document.getElementById('footerBrand').textContent = brand.name;

  const logoEl = document.getElementById('brandLogo');
  logoEl.src = `https://s3.amazonaws.com/theme-media/img/brand/${brand.slug}-icon.png`;
  logoEl.alt = brand.name;
  logoEl.onerror = () => {
    logoEl.src = "https://s3.amazonaws.com/theme-media/img/brand/heathrowparking-icon.png";
  };

  // Store brand for later
  window.brand = brand;
  window.depart = depart || "LGW";

  // Generate dates (30 days starting tomorrow)
  for (let i = 1; i <= 30; i++) {
    state.dates.push(datePlus(i));
  }

  // Initialize Step 1: Date Cards
  initDateCards();

  // Step 2: Out Time Slider
  initTimeSlider('outTimeThumb', 'outTimeValue', (time) => {
    state.outTime = time;
  }, 6); // Default 06:00

  document.getElementById('confirmOutTime').addEventListener('click', () => {
    // Generate return dates (starting from selected outDate + 1)
    const selectedOutDate = new Date(state.outDate);
    state.returnDates = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(selectedOutDate);
      d.setDate(d.getDate() + i);
      state.returnDates.push(d);
    }
    state.currentReturnDateIndex = 7; // Default to 8 days later
    state.inDate = formatDate(state.returnDates[7]);

    goToStep(3);
    initReturnDateCards();
  });

  // Step 3: Return Date Cards (initialized after step 2)

  // Step 4: In Time Slider
  initTimeSlider('inTimeThumb', 'inTimeValue', (time) => {
    state.inTime = time;
  }, 12); // Default 12:00

  document.getElementById('confirmInTime').addEventListener('click', () => {
    goToStep(5);
    showChatSummary();
  });

  // Step 5: Launch Search
  document.getElementById('launchSearch').addEventListener('click', () => {
    launchSearch();
  });
});

// Date Cards Swipe Interface
function initDateCards() {
  const container = document.getElementById('dateCards');
  renderDateCards(container, state.dates, state.currentDateIndex);

  document.getElementById('swipeLeftBtn').addEventListener('click', () => {
    if (state.currentDateIndex > 0) {
      state.currentDateIndex--;
      renderDateCards(container, state.dates, state.currentDateIndex);
    }
  });

  document.getElementById('swipeRightBtn').addEventListener('click', () => {
    if (state.currentDateIndex < state.dates.length - 1) {
      state.currentDateIndex++;
      renderDateCards(container, state.dates, state.currentDateIndex);
    }
  });

  // Tap to select
  container.addEventListener('click', (e) => {
    if (e.target.closest('.date-card.top')) {
      state.outDate = formatDate(state.dates[state.currentDateIndex]);
      document.getElementById('dateChoice').textContent = `✅ ${state.outDate} selected!`;
      setTimeout(() => goToStep(2), 800);
    }
  });
}

function initReturnDateCards() {
  const container = document.getElementById('returnDateCards');
  renderDateCards(container, state.returnDates, state.currentReturnDateIndex);

  document.getElementById('returnSwipeLeftBtn').addEventListener('click', () => {
    if (state.currentReturnDateIndex > 0) {
      state.currentReturnDateIndex--;
      renderDateCards(container, state.returnDates, state.currentReturnDateIndex);
    }
  });

  document.getElementById('returnSwipeRightBtn').addEventListener('click', () => {
    if (state.currentReturnDateIndex < state.returnDates.length - 1) {
      state.currentReturnDateIndex++;
      renderDateCards(container, state.returnDates, state.currentReturnDateIndex);
    }
  });

  container.addEventListener('click', (e) => {
    if (e.target.closest('.date-card.top')) {
      state.inDate = formatDate(state.returnDates[state.currentReturnDateIndex]);
      document.getElementById('returnDateChoice').textContent = `✅ ${state.inDate} selected!`;
      setTimeout(() => goToStep(4), 800);
    }
  });
}

function renderDateCards(container, dates, currentIndex) {
  container.innerHTML = '';

  // Show current and next card
  const indices = [currentIndex, currentIndex + 1].filter(i => i < dates.length);

  indices.forEach((index, i) => {
    const date = dates[index];
    const card = document.createElement('div');
    card.className = `date-card ${i === 0 ? 'top' : 'back'}`;
    card.innerHTML = `
      <div class="date-card-day">${getDayName(date)}</div>
      <div class="date-card-date">${date.getDate()}</div>
      <div class="date-card-month">${getMonthName(date)} ${date.getFullYear()}</div>
    `;
    container.appendChild(card);
  });
}

// Time Slider
function initTimeSlider(thumbId, valueId, onChange, defaultHour) {
  const thumb = document.getElementById(thumbId);
  const valueEl = document.getElementById(valueId);
  let isDragging = false;
  let currentHour = defaultHour;

  function updateTime(hour) {
    currentHour = Math.max(0, Math.min(23, hour));
    const timeString = `${currentHour.toString().padStart(2, '0')}:00`;
    const timeEncoded = `${currentHour.toString().padStart(2, '0')}%3A00`;
    valueEl.textContent = timeString;
    onChange(timeEncoded);

    // Update thumb position
    const percentage = (currentHour / 23) * 100;
    thumb.style.left = `${percentage}%`;
  }

  updateTime(currentHour);

  thumb.addEventListener('mousedown', () => isDragging = true);
  thumb.addEventListener('touchstart', () => isDragging = true);

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const track = thumb.parentElement;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const hour = Math.round((percentage / 100) * 23);
    updateTime(hour);
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const track = thumb.parentElement;
    const rect = track.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const hour = Math.round((percentage / 100) * 23);
    updateTime(hour);
  });

  document.addEventListener('mouseup', () => isDragging = false);
  document.addEventListener('touchend', () => isDragging = false);
}

// Chat Summary
function showChatSummary() {
  const outTimeDecoded = state.outTime.replace('%3A', ':');
  const inTimeDecoded = state.inTime.replace('%3A', ':');

  const summaryText = `
    📅 Drop-off: <strong>${state.outDate}</strong> at <strong>${outTimeDecoded}</strong><br>
    📅 Return: <strong>${state.inDate}</strong> at <strong>${inTimeDecoded}</strong><br><br>
    Ready to find you the best parking deals!
  `;

  document.getElementById('summaryText').innerHTML = summaryText;
}

// Navigation
function goToStep(step) {
  state.currentStep = step;

  // Hide all sections
  document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));

  // Show current section
  document.getElementById(`step${step}`).classList.add('active');

  // Update progress dots
  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i + 1 === step);
  });
}

// Launch Search
function launchSearch() {
  const host = window.location.host;
  const isLocal = host.startsWith("127") || host.includes("github.io");
  const basedomain = isLocal ? "www.holidayextras.com" : host;

  const agent = "WY992";
  const flight = "default";

  const searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${window.depart}&terminal=&arrive=&flight=${flight}&in=${state.inDate}&out=${state.outDate}&park_from=${state.outTime}&park_to=${state.inTime}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=&promotionCode=`;

  // Add a fun countdown
  const btn = document.getElementById('launchSearch');
  let countdown = 3;
  btn.textContent = `🚀 Launching in ${countdown}...`;
  btn.disabled = true;

  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      btn.textContent = `🚀 Launching in ${countdown}...`;
    } else {
      clearInterval(interval);
      btn.textContent = '🎉 BLAST OFF!';
      setTimeout(() => {
        window.location.href = searchUrl;
      }, 500);
    }
  }, 1000);
}
