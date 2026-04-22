### HTML
<div class="calendar-container">
  <div class="calendar-controls">
    <div class="location-selector">
      <select id="branchSelect" onchange="onAdminChange()">
        <option value="TanBinh_L1">Tân Bình - Location 1</option>
        <option value="TanBinh_L2">Tân Bình - Location 2</option>
      </select>
    </div>

    <div class="date-navigator">
      <span id="displayDate" class="current-date">Mon 20 Apr 2026</span>
      <div class="nav-buttons">
        <button onclick="changeDate(-1)">&lt;</button>
        <button onclick="changeDate(1)">&gt;</button>
        <button class="today-btn" onclick="goToToday()">Today</button>
      </div>
    </div>
  </div>

  <header class="calendar-header"></header>
  <main class="calendar-grid">
    <div class="time-labels">
      <div class="time-slot" >10 AM</div>
      <div class="time-slot" >11 AM</div>
      <div class="time-slot" >12 PM</div>
      <div class="time-slot" >1 PM</div>
      <div class="time-slot" >2 PM</div>
      <div class="time-slot" >3 PM</div>
      <div class="time-slot">4 PM</div>
      <div class="time-slot">5 PM</div>
      <div class="time-slot">6 PM</div>
      <div class="time-slot">7 PM</div>
      <div class="time-slot">8 PM</div>
      <div class="time-slot">9 PM</div>
      <div class="time-slot">10 PM</div>
    </div>
    <div class="grid-lines"></div>
  </main>
 </div>

### JS 
const OPENING_HOUR = 10;
const SLOT_DURATION = 15;
const ROW_HEIGHT = 25;

// Config for different branches
const branchConfigs = {
  "TanBinh_L1": ["Tran", "Thanh N.", "Huyen", "Chau", "Suu"],
  "TanBinh_L2": ["NV 1", "NV 2", "NV 3", "NV 4", "NV 5", "NV 6", "NV 7"]
};

// Global State
let staffList = [...branchConfigs["TanBinh_L1"]];
let currentDate = new Date(); // Today

/**
 * CORE LOGIC: Triggered by any Admin UI change
 */
async function onAdminChange() {
  const branchKey = document.getElementById('branchSelect').value;
  
  // 1. Update Staffing for that branch
  staffList = [...branchConfigs[branchKey]];
  renderStaffHeaders();

  // 2. Clear current appointments from the grid
  const existingApps = document.querySelectorAll('.appointment');
  existingApps.forEach(app => app.remove());

  // 3. Simulated Fetch (Mocking your Prod API)
  const data = await mockFetchBookings(currentDate, branchKey);
  
  // 4. Render new data
  data.forEach(booking => renderAppointment(booking));
  
  // 5. Sync UI
  updateDateDisplay();
  updateNowLine();
}

/**
 * UI Renderers
 */
function renderStaffHeaders() {
  document.documentElement.style.setProperty('--staff-count', staffList.length);
  const header = document.querySelector('.calendar-header');
  header.innerHTML = '<div class="time-column"></div>';
  
  staffList.forEach(staffName => {
    const div = document.createElement('div');
    div.className = 'staff-header';
    div.textContent = staffName;
    header.appendChild(div);
  });
}

function renderAppointment(data) {
  const grid = document.querySelector('.calendar-grid');
  const appointment = document.createElement('div');
  const staffIndex = staffList.indexOf(data.staff);
  
  if (staffIndex === -1) return;

  const startRow = timeToRow(data.start);
  const rowSpan = data.duration / SLOT_DURATION;

  appointment.className = 'appointment';
  appointment.style.gridColumn = staffIndex + 2; 
  appointment.style.gridRow = `${startRow} / span ${rowSpan}`;

  appointment.innerHTML = `
    <span class="service">${data.service}</span>
    <span class="client">${data.name}</span>
  `;

  grid.appendChild(appointment);
  if (window.gsap) {
    gsap.from(appointment, { opacity: 0, scale: 0.9, y: 10, duration: 0.4 });
  }
}

/**
 * Date Navigation Logic
 */
function updateDateDisplay() {
  const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  document.getElementById('displayDate').textContent = currentDate.toLocaleDateString('en-GB', options);
}

function changeDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  onAdminChange();
}

function goToToday() {
  currentDate = new Date();
  onAdminChange();
}

/**
 * Helpers
 */
function timeToRow(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const minutesFromStart = (hours - OPENING_HOUR) * 60 + minutes;
  return (minutesFromStart / SLOT_DURATION) + 1;
}

function updateNowLine() {
  const grid = document.querySelector('.calendar-grid');
  let nowLine = document.querySelector('.now-indicator');
  
  if (!nowLine) {
    nowLine = document.createElement('div');
    nowLine.className = 'now-indicator';
    nowLine.innerHTML = `<span class="now-badge"></span>`;
    grid.appendChild(nowLine);
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  
  nowLine.querySelector('.now-badge').textContent = currentTimeStr;
  const currentRow = timeToRow(currentTimeStr);

  if (currentRow < 1 || currentRow > 49) {
    nowLine.style.display = 'none';
  } else {
    nowLine.style.display = 'block';
    gsap.to(nowLine, { top: (currentRow - 1) * ROW_HEIGHT, duration: 1, ease: "power2.out" });
  }
}



/**
 * MOCK DATA FETCH (Replace with fetch() in Prod)
 */
function mockFetchBookings(date, branch) {
  return new Promise((resolve) => {
    // Just a demo: different data for different branches
    const mockData = branch === "TanBinh_L1" ? [
      { name: "Rashad Robinson", service: "Body Massage", start: "10:00", duration: 60, staff: "Tran" },
      { name: "Chị Ý", service: "Y Voi Vang", start: "14:00", duration: 30, staff: "Tran" }
    ] : [
      { name: "Bernard", service: "Skin Care", start: "11:30", duration: 90, staff: "NV 2" }
    ];
    
    setTimeout(() => resolve(mockData), 100); // Simulate network delay
  });
}



// Startup
window.onload = () => {
  onAdminChange(); // This runs the initial render
  setInterval(updateNowLine, 60000);
};

### CSS
:root {
  --row-height: 25px;
  --hour-height: calc(var(--row-height) * 4); /* 15min * 4 = 1 hour */
  --time-col-width: 75px; /* Increased to fit the black time badge comfortably */
  --border-color: #e5e7eb;
  --accent-color: #3b82f6;
}
/* Container for the whole top bar */
.calendar-controls {
  display: flex;
  flex-direction: row-reverse; /* Flips the order: Date Left, Location Right */
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
}

/* Date Navigator (Now on the Left) */
.date-navigator {
  display: flex;
  align-items: center;
}

/* The "Mon 20 Apr 2026" pill style from your screenshot */
.current-date {
  font-weight: 500;
  font-size: 16px;
  color: #111827;
  padding: 8px 18px;
  border-radius: 20px;
  cursor: pointer;
  margin-right: 10px;
}

.current-date:hover {
  background-color: #f3f4f6; /* Light gray pill background */
}

.nav-buttons {
  display: flex;
  align-items: center;
}

/* Simple chevron styling */
.nav-buttons button {
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  color: #6b7280;
  font-size: 16px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.nav-buttons button:hover {
  color: #111827;
  
  background-color: #f3f4f6; /* Light gray pill background */
}

/* "Today" link style */
.today-btn {
  font-size: 12px;
  font-weight: 500;
  margin-left: 15px;
  text-decoration: none;
}

/* Location Selector (Now on the Right) */
.location-selector {
  display: flex;
  align-items: center;
}

#branchSelect {
  padding: 8px 12px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  color: #374151;
  background-color: #fff;
  cursor: pointer;
  background: #f5f5f5;
  min-width: 180px;
}

#branchSelect:focus {
  outline: none;
}

/* Add Button Styling */
.add-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-left: 15px; /* Space between selector and button */
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.add-btn:hover {
  background-color: #2563eb;
}

.add-btn:active {
  transform: scale(0.98);
}


/*Calendar Part*/

.calendar-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Inter', sans-serif;
  color: #1f2937;
}

/* Ensure the header also stays in sync */
.calendar-header {
  display: grid;
  grid-template-columns: var(--time-col-width) repeat(var(--staff-count, 3), 1fr);
  border-bottom: 1px solid var(--border-color);
  background: white;
  z-index: 10;
}

.staff-header {
  padding: 15px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  border-right: 1px solid var(--border-color);
}

.calendar-header, .calendar-grid {
  display: grid;
  /* We will set the column count dynamically in JS to match staffList.length */
  grid-template-columns: var(--time-col-width) repeat(var(--staff-count, 3), 1fr);
}

.calendar-grid {
  display: grid;
  /* Use the variable to define columns */
  grid-template-columns: var(--time-col-width) repeat(var(--staff-count, 3), 1fr);
  grid-template-rows: repeat(48, var(--row-height));
  position: relative;
  overflow-y: auto;
  flex-grow: 1;

  /* Dynamically calculate vertical line positions based on staff count */
  background-image: linear-gradient(to right, var(--border-color) 1px, transparent 1px);
  background-size: calc((100% - var(--time-col-width)) / var(--staff-count, 3)) 100%;
  background-position: var(--time-col-width) 0;
}

/* Hourly-only horizontal lines for a cleaner look */
.grid-lines {
  grid-column: 2 / -1;
  grid-row: 1 / -1;
  background-image: linear-gradient(var(--border-color) 1px, transparent 1px);
  background-size: 100% var(--hour-height);
  pointer-events: none;
  border-right: 1px solid var(--border-color);
}

.time-labels {
  grid-column: 1;
  display: grid;
  grid-template-rows: repeat(12, var(--hour-height));
}

.time-slot {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  padding-top: 5px;
  border-right: 1px solid var(--border-color);
}

/* Appointment Styling */
.appointment {
  margin: 2px;
  padding: 8px;
  background-color: #eff6ff;
  border-left: 4px solid var(--accent-color);
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  z-index: 2;
  cursor: pointer;
}

.service { font-weight: 700; }
.client { font-size: 11px; opacity: 0.8; }

/* The Now Indicator (Black & Minimalist) */
.now-indicator {
  position: absolute;
  left: var(--time-col-width);
  width: calc(100% - var(--time-col-width));
  height: 2px;
  background-color: #000;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 2px rgba(255,255,255,0.8);
}

/* The vertical start-tick on the line */
.now-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  top: -4px;
  width: 2px;
  height: 10px;
  background-color: #000;
}

/* The Black Time Badge */
.now-badge {
  position: absolute;
  left: -65px; /* Positioned within the time-labels column */
  top: -10px;
  background-color: #000;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 3px 6px;
  border-radius: 4px;
  min-width: 40px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}