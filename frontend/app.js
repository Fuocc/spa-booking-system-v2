/**
 * YOi Spa Booking - Frontend Application
 * 5-step booking wizard with availability checking
 */

const API_BASE = window.location.origin + '/api';

const DISABLE_AFTER_TIME = '20:00'; // from 20:00 -> disabled on UI (still show slots)
const SKIP_DURATION_MINUTES = 60;

const CUSTOMER_STORAGE_KEY = 'spa_booking_customer';

// ---- State ----
const state = {
  currentStep: 1,
  totalSteps: 5,
  branches: [],
  services: [],
  selectedBranch: null,
  selectedService: null, // null means "Skip"
  selectedDate: null,
  selectedTime: null,
  availabilitySlots: [] // merged slots
};

// ---- DOM References ----
const $form = document.getElementById('booking-form');
const $btnPrev = document.getElementById('btn-prev');
const $btnNext = document.getElementById('btn-next');
const $btnSubmit = document.getElementById('btn-submit');
const $successMessage = document.getElementById('success-message');

// ---- Init ----
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await Promise.all([loadBranches(), loadServices()]);
  populateDateDropdown();
  bindEvents();
  loadCustomerFromStorage();
  updateStepUI();
  applyServiceDetailUI(); // initial (skip)
}

// ---- Data Loading ----
async function loadBranches() {
  try {
    const res = await fetch(`${API_BASE}/branches`);
    state.branches = await res.json();

    const $select = document.getElementById('branch');
    // reset options (except placeholder)
    $select.querySelectorAll('option:not([disabled])').forEach(o => o.remove());

    state.branches.forEach(branch => {
      const opt = document.createElement('option');
      opt.value = branch.id;
      opt.textContent = branch.name;
      $select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading branches:', err);
  }
}

async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/services`);
    state.services = await res.json();

    const $select = document.getElementById('service');
    // Keep first option as Skip (value="")
    $select.querySelectorAll('option').forEach((o, idx) => {
      if (idx !== 0) o.remove();
    });

    state.services.forEach(service => {
      if (service.is_active === false) return;
      const opt = document.createElement('option');
      opt.value = service.id;
      opt.textContent = `${service.name} - ${formatPrice(service.price)} (${service.duration_minutes} phút)`;
      $select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

function populateDateDropdown() {
  const $select = document.getElementById('booking-date');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Show remaining days of current month + next month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInNextMonth = new Date(year, month + 2, 0).getDate();

  // Clear existing except placeholder
  $select.querySelectorAll('option').forEach((o, idx) => {
    if (idx !== 0) o.remove();
  });

  // Current month remaining days
  for (let d = today.getDate(); d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = formatDateISO(date);
    const opt = document.createElement('option');
    opt.value = dateStr;
    opt.textContent = formatDateDisplay(date);
    $select.appendChild(opt);
  }

  // Next month days
  for (let d = 1; d <= daysInNextMonth; d++) {
    const date = new Date(year, month + 1, d);
    const dateStr = formatDateISO(date);
    const opt = document.createElement('option');
    opt.value = dateStr;
    opt.textContent = formatDateDisplay(date);
    $select.appendChild(opt);
  }
}

// ---- Event Binding ----
function bindEvents() {
  $btnNext.addEventListener('click', handleNext);
  $btnPrev.addEventListener('click', handlePrev);
  $form.addEventListener('submit', handleSubmit);
  document.getElementById('btn-new-booking').addEventListener('click', resetForm);

  // Service change → show detail card
  document.getElementById('service').addEventListener('change', handleServiceChange);

  // Date change → load availability
  document.getElementById('booking-date').addEventListener('change', handleDateChange);

  // guests change should reset downstream selections
  document.getElementById('num-guests').addEventListener('change', () => {
    resetAfterStep1();
  });

  // Branch change
  document.getElementById('branch').addEventListener('change', (e) => {
    state.selectedBranch = state.branches.find(b => b.id === e.target.value) || null;
  });
}

function resetAfterStep1() {
  // Step2 data depends on num_guests + service
  state.selectedDate = null;
  state.selectedTime = null;
  state.availabilitySlots = [];

  const $date = document.getElementById('booking-date');
  $date.value = '';
  const $container = document.getElementById('time-slots-container');
  const $grid = document.getElementById('time-slots-grid');
  if ($grid) $grid.innerHTML = '';
  if ($container) $container.style.display = 'none';

  // Step3 branch selection depends on slot
  state.selectedBranch = null;
  const $branch = document.getElementById('branch');
  if ($branch) $branch.value = '';
}

function handleServiceChange(e) {
  const serviceId = e.target.value; // "" => Skip
  const service = state.services.find(s => s.id === serviceId) || null;
  state.selectedService = service;

  applyServiceDetailUI();
  resetAfterStep1();
}

function applyServiceDetailUI() {
  const $detail = document.getElementById('service-detail');

  if (state.selectedService) {
    const service = state.selectedService;
    document.getElementById('service-detail-name').textContent = service.name;
    document.getElementById('service-detail-price').textContent = formatPrice(service.price);
    document.getElementById('service-detail-desc').textContent = service.description || '';
    document.getElementById('service-duration-text').textContent = `${service.duration_minutes} phút`;
    $detail.style.display = 'block';
  } else {
    // Skip
    $detail.style.display = 'none';
  }
}

async function handleDateChange(e) {
  state.selectedDate = e.target.value;
  state.selectedTime = null;
  document.getElementById('selected-time').value = '';

  // reset branch
  state.selectedBranch = null;
  const $branch = document.getElementById('branch');
  if ($branch) $branch.value = '';

  if (!state.selectedDate) return;

  const $container = document.getElementById('time-slots-container');
  const $grid = document.getElementById('time-slots-grid');
  $grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--muted-gray);">Đang tải...</div>';
  $container.style.display = 'block';

  try {
    const numGuests = parseInt(document.getElementById('num-guests').value) || 1;
    const serviceId = document.getElementById('service').value || '';
    const durationMinutes = state.selectedService ? null : SKIP_DURATION_MINUTES;

    const qs = new URLSearchParams({
      date: state.selectedDate,
      num_guests: String(numGuests),
      ...(serviceId ? { service_id: serviceId } : {}),
      ...(!serviceId ? { duration_minutes: String(durationMinutes) } : {})
    });

    const res = await fetch(`${API_BASE}/availability/merged?${qs.toString()}`);
    const data = await res.json();

    state.availabilitySlots = data.slots || [];
    renderTimeSlots();
  } catch (err) {
    console.error('Error loading merged availability:', err);
    $grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--error-red);">Lỗi tải dữ liệu</div>';
  }
}

function renderTimeSlots() {
  const $grid = document.getElementById('time-slots-grid');
  $grid.innerHTML = '';

  if (state.availabilitySlots.length === 0) {
    $grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--muted-gray);">Không có khung giờ nào</div>';
    return;
  }

  const todaySelected = isSelectedDateToday();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  state.availabilitySlots.forEach(slot => {
    const slotMinutes = timeToMinutesHHMM(slot.start_time);

    // Disable slot nếu:
    // - slot từ backend đã unavailable
    // - hoặc ngày đang chọn là hôm nay và slot <= giờ hiện tại
    const isPastByNow = todaySelected && slotMinutes <= nowMinutes;
    const uiDisabledByTime = slot.start_time >= DISABLE_AFTER_TIME;
    const selectable = slot.available && !isPastByNow && !uiDisabledByTime;

    const $slot = document.createElement('button');
    $slot.type = 'button';
    $slot.className = `time-slot${selectable ? '' : ' disabled'}`;
    $slot.textContent = slot.start_time;
    $slot.dataset.start = slot.start_time;
    $slot.dataset.end = slot.end_time;

    if (selectable) {
      $slot.addEventListener('click', () => selectTimeSlot($slot, slot));
    }

    $grid.appendChild($slot);
  });
}

function selectTimeSlot($slot, slot) {
  // Deselect previous
  document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
  $slot.classList.add('selected');

  state.selectedTime = slot;
  document.getElementById('selected-time').value = slot.start_time;
}

// ---- Step Navigation ----
function handleNext() {
  if (!validateCurrentStep()) return;

  // Special: when leaving step 2 -> step 3, auto-select branch if only one available
  if (state.currentStep === 2) {
    const branchIds = state.selectedTime?.branches || [];
    if (branchIds.length === 1) {
      const onlyBranch = state.branches.find(b => b.id === branchIds[0]) || null;
      state.selectedBranch = onlyBranch;

      const $branch = document.getElementById('branch');
      if ($branch && onlyBranch) $branch.value = onlyBranch.id;

      // skip step 3
      state.currentStep = 4;
      updateStepUI();
      return;
    }
  }

  if (state.currentStep < state.totalSteps) {
    state.currentStep++;
    updateStepUI();

    if (state.currentStep === 5) {
      populateConfirmation();
    }
  }
}

function handlePrev() {
  // If we are in step4 but step3 was auto-skipped, go back to step2
  if (state.currentStep === 4 && state.selectedTime?.branches?.length === 1) {
    state.currentStep = 2;
    updateStepUI();
    return;
  }

  if (state.currentStep > 1) {
    state.currentStep--;
    updateStepUI();
  }
}

function updateStepUI() {
  // Update step content
  document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
  const activeStep = document.getElementById(`step-${state.currentStep}`);
  if (activeStep) activeStep.classList.add('active');

  // Update step indicators
  document.querySelectorAll('.step-item').forEach(item => {
    const step = parseInt(item.dataset.step);
    item.classList.remove('active', 'completed');
    if (step === state.currentStep) item.classList.add('active');
    if (step < state.currentStep) item.classList.add('completed');
  });

  // Update step lines
  const lines = document.querySelectorAll('.step-line');
  lines.forEach((line, i) => {
    if (i < state.currentStep - 1) {
      line.classList.add('active');
    } else {
      line.classList.remove('active');
    }
  });

  // Show/hide buttons
  $btnPrev.style.display = state.currentStep > 1 ? 'inline-flex' : 'none';
  $btnNext.style.display = state.currentStep < state.totalSteps ? 'inline-flex' : 'none';
  $btnSubmit.style.display = state.currentStep === state.totalSteps ? 'inline-flex' : 'none';
}

function validateCurrentStep() {
  switch (state.currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return validateStep3();
    case 4:
      return validateStep4();
    default:
      return true;
  }
}

function validateStep1() {
  const guests = document.getElementById('num-guests');
  if (!guests.value) {
    shake(guests);
    return false;
  }
  // service is optional (skip)
  return true;
}

function validateStep2() {
  const date = document.getElementById('booking-date');
  if (!date.value) {
    shake(date);
    return false;
  }
  if (!state.selectedTime) {
    const $grid = document.getElementById('time-slots-grid');
    shake($grid);
    return false;
  }
  return true;
}

function validateStep3() {
  const branches = state.selectedTime?.branches || [];
  if (branches.length === 1) return true; // auto-handled

  const branch = document.getElementById('branch');
  if (!branch.value) {
    shake(branch);
    return false;
  }
  const chosen = state.branches.find(b => b.id === branch.value) || null;
  if (!chosen) {
    shake(branch);
    return false;
  }

  // Ensure chosen branch is allowed for the selected slot
  if (!branches.includes(chosen.id)) {
    alert('Khung giờ này chỉ trống ở chi nhánh khác. Vui lòng chọn chi nhánh phù hợp.');
    shake(branch);
    return false;
  }

  state.selectedBranch = chosen;
  return true;
}

function validateStep4() {
  const name = document.getElementById('customer-name');
  const phone = document.getElementById('customer-phone');

  let valid = true;
  if (!name.value.trim()) {
    shake(name);
    valid = false;
  }
  if (!phone.value.trim() || !/^[0-9]{10,11}$/.test(phone.value.trim())) {
    shake(phone);
    valid = false;
  }

  // also ensure branch chosen (if step 3 was skipped)
  if (!state.selectedBranch) {
    alert('Vui lòng chọn chi nhánh.');
    valid = false;
  }

  return valid;
}


function shake(el) {
  if (!el) return;
  el.classList.add('error');
  el.style.animation = 'none';
  el.offsetHeight; // Trigger reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => {
    el.classList.remove('error');
    el.style.animation = '';
  }, 500);
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    50% { transform: translateX(6px); }
    75% { transform: translateX(-6px); }
  }
`;
document.head.appendChild(shakeStyle);

// ---- Confirmation ----
function populateConfirmation() {
  const numGuests = parseInt(document.getElementById('num-guests').value) || 1;
  const notes = document.getElementById('notes').value.trim();

  document.getElementById('confirm-branch').textContent = state.selectedBranch?.name || '-';
  document.getElementById('confirm-guests').textContent = numGuests + ' người';
  document.getElementById('confirm-name').textContent = document.getElementById('customer-name').value;
  document.getElementById('confirm-phone').textContent = document.getElementById('customer-phone').value;
  document.getElementById('confirm-email').textContent = document.getElementById('customer-email').value || null;

  if (state.selectedService) {
    document.getElementById('confirm-service').textContent = state.selectedService.name;
    document.getElementById('confirm-duration').textContent = `${state.selectedService.duration_minutes} phút`;
  } else {
    document.getElementById('confirm-service').textContent = 'Giữ chỗ';
    document.getElementById('confirm-duration').textContent = `${SKIP_DURATION_MINUTES} phút`;
  }

  document.getElementById('confirm-date').textContent = state.selectedDate
    ? formatDateDisplay(new Date(state.selectedDate + 'T00:00:00'))
    : '-';

  document.getElementById('confirm-time').textContent = state.selectedTime
    ? `${state.selectedTime.start_time} - ${state.selectedTime.end_time}`
    : '-';

  document.getElementById('confirm-notes').textContent = notes || null;

  // Price: if Skip => 0, else price * guests
  const totalPrice = (state.selectedService?.price || 0) * numGuests;
  document.getElementById('confirm-price').textContent = formatPrice(totalPrice);
}

// ---- Submit ----
async function handleSubmit(e) {
  e.preventDefault();

  const $btn = $btnSubmit;
  $btn.classList.add('loading');
  $btn.disabled = true;

  const payload = {
    branch_id: state.selectedBranch.id,
    service_id: state.selectedService.id,
    num_guests: parseInt(document.getElementById('num-guests').value) || 1,
    customer_name: document.getElementById('customer-name').value.trim(),
    customer_phone: document.getElementById('customer-phone').value.trim(),
    customer_email: document.getElementById('customer-email').value.trim() || null,
    booking_date: state.selectedDate,
    start_time: state.selectedTime.start_time,
    notes: document.getElementById('notes').value.trim() || null
  };

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Booking failed');
    }

    // Success
    saveCustomerToStorage();
    $form.style.display = 'none';
    document.getElementById('steps-indicator').style.display = 'none';
    $successMessage.style.display = 'block';
  } catch (err) {
    alert('Đặt lịch thất bại: ' + err.message);
  } finally {
    $btn.classList.remove('loading');
    $btn.disabled = false;
  }
}

function resetForm() {
  state.currentStep = 1;
  state.selectedBranch = null;
  state.selectedService = null;
  state.selectedDate = null;
  state.selectedTime = null;
  state.availabilitySlots = [];

  $form.reset();
  $form.style.display = 'block';
  document.getElementById('steps-indicator').style.display = 'flex';
  $successMessage.style.display = 'none';
  document.getElementById('service-detail').style.display = 'none';
  document.getElementById('time-slots-container').style.display = 'none';

  updateStepUI();
  applyServiceDetailUI();
}

// ---- Helpers ----
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(date) {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const day = days[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${day}, ${d}/${m}/${y}`;
}

function timeToMinutesHHMM(timeStr) {
  // timeStr "HH:MM"
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function isSelectedDateToday() {
  if (!state.selectedDate) return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayISO = `${yyyy}-${mm}-${dd}`;
  return state.selectedDate === todayISO;
}

function saveCustomerToStorage() {
  const data = {
    name: document.getElementById('customer-name').value.trim(),
    phone: document.getElementById('customer-phone').value.trim(),
    email: document.getElementById('customer-email').value.trim()
  };
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data));
}

function loadCustomerFromStorage() {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data?.name) document.getElementById('customer-name').value = data.name;
    if (data?.phone) document.getElementById('customer-phone').value = data.phone;
    if (data?.email) document.getElementById('customer-email').value = data.email;
  } catch (_) {
    // ignore parse errors
  }
}