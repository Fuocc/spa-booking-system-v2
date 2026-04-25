import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { FiPlus, FiChevronLeft, FiChevronRight, FiCalendar, FiList } from 'react-icons/fi';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { toast } from 'react-toastify'

import {
  getBookingsRange, getBookings, createBooking, updateBooking, updateBookingStatus, deleteBooking,
  getBranches, getServices, getAvailability, getEmployees, getCustomers, getEmployeeSchedules
} from '../api';

import userIcon from '../assets/user-icon.svg';
import shopIcon from '../assets/shop-icon.svg';
import clockIcon from '../assets/clock-icon.svg';
import noteIcon from '../assets/note-icon.svg';

import { DatePicker, parseDate } from "@chakra-ui/react"
import '../timepicker.css';
// ---- Helpers ----
const OPEN_HOUR = 10;
const CLOSE_HOUR = 22;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d);
  monday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_NAMES_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const STATUS_COLORS = {
  confirmed: { bg: '#e6f4ec', border: '#0d8a3f', text: '#0d8a3f' },
  pending: { bg: '#fef3e2', border: '#e67e22', text: '#e67e22' },
  completed: { bg: '#eff6ff', border: '#2563eb', text: '#2563eb' }
};

const formatPrice = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
const formatTime = (t) => t ? t.substring(0, 5) : '-';

const formatTime12h = (timeStr) => {
  if (!timeStr || timeStr === '00:00') return '00:00';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

const normalizeName = (name) => {
  if (!name) return '';
  let cleaned = name.trim();
  if (cleaned.toLowerCase().startsWith('c ')) {
    cleaned = 'Chị ' + cleaned.substring(2);
  } else if (cleaned.toLowerCase().startsWith('a ')) {
    cleaned = 'Anh ' + cleaned.substring(2);
  }
  return cleaned.split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const TimePicker = ({ value, onChange, bookingDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = Array.from({ length: 49 }, (_, i) => {
    const total = 10 * 60 + i * 15;
    const t = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;

    const isToday = bookingDate === toDateStr(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const isPast = isToday && total <= nowMin;

    return { val: t, h12: String(h12).padStart(2, '0'), m: String(m).padStart(2, '0'), ampm, disabled: isPast };
  });

  const currentOpt = options.find(o => o.val === value) || { h12: '--', m: '--' };

  return (
    <div className="custom-time-picker-container" ref={containerRef}>
      <div className="custom-time-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
        {currentOpt.h12}:{currentOpt.m} {currentOpt.ampm}
      </div>
      {isOpen && (
        <div className="custom-time-picker-dropdown">
          {options.map(opt => (
            <div
              key={opt.val}
              className={`time-option-item ${opt.val === value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
              onClick={() => {
                onChange(opt.val);
                setIsOpen(false);
              }}
            >
              <div className="time-option-val">{opt.h12}:{opt.m}</div>
              <div className="time-option-suffix">{opt.ampm}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function Bookings({ data }) {
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]); // All active employees of filtered branch
  const [filterBranch, setFilterBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Booking modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [detailEdit, setDetailEdit] = useState(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [employeesByBranch, setEmployeesByBranch] = useState([]); // for dropdown in detail edit
  const [bookForm, setBookForm] = useState({
    branch_id: '', service_id: '', num_guests: 1,
    customer_name: '', customer_phone: '', customer_email: '',
    booking_date: '', start_time: '', notes: ''
  });
  const [availSlots, setAvailSlots] = useState([]);
  const [bookStep, setBookStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState({ type: null, data: [], loading: false });
  const [customerView, setCustomerView] = useState('default'); // 'default', 'searching', 'selected', 'creating'
  const [showCalendar, setShowCalendar] = useState(false);
  const [detailTab, setDetailTab] = useState('schedule'); // 'schedule' or 'customer'
  const [employeeSchedules, setEmployeeSchedules] = useState([]);
  const searchTimeoutRef = useRef(null);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const bodyRef = useRef(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  const notify = (msg) => {
    toast.success(msg || "Cập nhật thành công", {
      position: "bottom-right"
    });
  };

  useLayoutEffect(() => {
    if (!bodyRef.current) return;

    const calculate = () => {
      const el = bodyRef.current;
      const width = el.offsetWidth - el.clientWidth;
      setScrollbarWidth(width);
    };

    const observer = new ResizeObserver(() => {
      calculate();
    });

    observer.observe(bodyRef.current);

    calculate();

    return () => observer.disconnect();
  }, [data]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [currentDate, filterBranch]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadInitialData = async () => {
    try {
      const [b, s] = await Promise.all([getBranches(), getServices()]);
      setBranches(b);
      setServices(s);
      if (b.length > 0 && !filterBranch) {
        setFilterBranch(b[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const dayStr = toDateStr(currentDate);
      // Fetch bookings, employees, AND schedules for the single day
      const [bookingsData, employeesData, schedulesData] = await Promise.all([
        getBookingsRange(dayStr, dayStr, filterBranch || undefined),
        filterBranch ? getEmployees(filterBranch) : Promise.resolve([]),
        getEmployeeSchedules({ date_from: dayStr, date_to: dayStr })
      ]);

      setBookings(bookingsData.filter(b => b.status !== 'cancelled'));
      setEmployees(employeesData.filter(e => e.is_active));
      setEmployeeSchedules(schedulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleCancel = async (id) => {
    if (!confirm('Bạn có chắc muốn hủy lịch hẹn này?')) return;
    try {
      await deleteBooking(id);
      notify('Đã hủy lịch hẹn thành công!');
      loadBookings();
      setDetailModal(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // ---- Booking Modal Logic ----
  const openBookingModal = (preDate, preEmployee) => {
    setBookForm({
      branch_id: filterBranch || (branches[0]?.id || ''),
      service_id: '', num_guests: 1,
      customer_name: '', customer_phone: '', customer_email: '',
      service_search: '',
      employee_search: preEmployee ? preEmployee.name : '',
      employee_id: preEmployee ? preEmployee.id : '',
      booking_date: preDate || toDateStr(new Date()),
      start_time: '--:--', end_time: '--:--', notes: ''
    });
    setBookStep(1);
    setCustomerView('default');
    setAvailSlots([]);
    setSelectedService(null);
    setModalOpen(true);
  };

  const loadAvailability = async () => {
    if (!bookForm.branch_id || !bookForm.service_id || !bookForm.booking_date) return;
    setSlotsLoading(true);
    try {
      const data = await getAvailability({
        branch_id: bookForm.branch_id,
        service_id: bookForm.service_id,
        date: bookForm.booking_date,
        num_guests: bookForm.num_guests
      });
      setAvailSlots(data.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const calculateEndTime = (startTime, duration) => {
    if (!startTime || startTime === '--:--' || !duration) return '--:--';
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + duration + 15;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  const handleBookFormServiceChange = (service) => {
    if (!service) {
      setSelectedService(null);
      setBookForm(f => ({ ...f, service_id: '', end_time: '' }));
      return;
    }
    setSelectedService(service);
    setBookForm(f => {
      const newEndTime = calculateEndTime(f.start_time, service.duration_minutes);
      return {
        ...f,
        service_id: service.id,
        service_search: service.name,
        end_time: newEndTime
      };
    });
    setAvailSlots([]);
  };

  const handleGenericSearch = (type, val) => {
    const fieldMap = {
      customer: 'customer_name',
      service: 'service_search',
      employee: 'employee_search'
    };
    const field = fieldMap[type];
    setBookForm(prev => ({ ...prev, [field]: val }));

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    setSearchSuggestions(prev => ({ ...prev, type, loading: true }));
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results = [];
        if (type === 'customer') {
          results = await getCustomers(val);
        } else if (type === 'service') {
          results = services.filter(s => s.is_active && (
            s.name.toLowerCase().includes(val.toLowerCase()) ||
            (s.description && s.description.toLowerCase().includes(val.toLowerCase()))
          ));
        } else if (type === 'employee') {
          const emps = await getEmployees(bookForm.branch_id || undefined);
          results = emps.filter(e => e.is_active && e.name.toLowerCase().includes(val.toLowerCase()));
        }
        setSearchSuggestions({ type, data: results, loading: false });
      } catch (err) {
        console.error('Search error:', err);
        setSearchSuggestions(prev => ({ ...prev, loading: false }));
      }
    }, 300);
  };

  const handleSelectSuggestion = (type, item) => {
    if (type === 'customer') {
      if (item === 'new') {
        const query = bookForm.customer_name;
        const isPhone = /^\d+$/.test(query);
        setBookForm(prev => ({
          ...prev,
          customer_name: isPhone ? '' : query,
          customer_phone: isPhone ? query : ''
        }));
        setCustomerView('creating');
      } else {
        setBookForm(prev => ({
          ...prev,
          customer_name: item.name,
          customer_phone: item.phone || '',
          customer_email: item.email || ''
        }));
        setCustomerView('selected');
      }
    } else if (type === 'service') {
      handleBookFormServiceChange(item);
    } else if (type === 'employee') {
      setBookForm(prev => ({
        ...prev,
        employee_id: item.id,
        employee_search: item.name
      }));
    }
    setSearchSuggestions({ type: null, data: [], loading: false });
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const required = {
      'Dịch vụ': bookForm.service_id,
      'Ngày': bookForm.booking_date,
      'Giờ bắt đầu': bookForm.start_time,
      'Tên khách': bookForm.customer_name,
      'SĐT khách': bookForm.customer_phone,
      'Chi nhánh': bookForm.branch_id
    };

    const missing = Object.entries(required).filter(([_, val]) => !val).map(([label]) => label);
    if (missing.length > 0) {
      alert('Vui lòng điền các thông tin bắt buộc: ' + missing.join(', '));
      return;
    }

    try {
      const finalForm = {
        ...bookForm,
        customer_name: normalizeName(bookForm.customer_name)
      };
      await createBooking(finalForm);
      notify('Đặt lịch thành công!');
      setModalOpen(false);
      loadBookings();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleSaveDetail = async () => {
    if (!detailModal || !detailEdit) return;

    if (!detailEdit.service_id || !detailEdit.branch_id || !detailEdit.start_time || !detailEdit.employee_id) {
      alert('Vui lòng chọn đầy đủ: dịch vụ, chi nhánh, giờ, nhân viên');
      return;
    }

    setDetailSaving(true);
    try {
      const updated = await updateBooking(detailModal.id, {
        service_id: detailEdit.service_id,
        branch_id: detailEdit.branch_id,
        start_time: detailEdit.start_time,
        end_time: detailEdit.end_time,
        employee_id: detailEdit.employee_id
      });

      // update list in UI immediately
      setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
      setDetailModal(updated); // keep modal in sync

      if (typeof notify === 'function') {
        notify('Cập nhật thành công!');
      }

      setDetailModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailSaving(false);
    }
  };

  const handleOpenDetail = async (booking) => {
    setDetailModal(booking);

    // init edit state
    setDetailEdit({
      service_id: booking.service_id || booking.services?.id || '',
      branch_id: booking.branch_id || booking.branches?.id || '',
      start_time: (booking.start_time || '').substring(0, 5),
      end_time: (booking.end_time || '').substring(0, 5),
      employee_id: booking.employee_id || booking.employees?.id || ''
    });

    setDetailTab('schedule');
    try {
      const emps = await getEmployees(booking.branch_id);
      setEmployeesByBranch((emps || []).filter(e => e.is_active));
    } catch (e) {
      console.error(e);
      setEmployeesByBranch([]);
    }
  };

  const isDetailModified = useMemo(() => {
    if (!detailModal || !detailEdit) return false;
    return (
      detailEdit.service_id !== (detailModal.service_id || detailModal.services?.id) ||
      detailEdit.branch_id !== (detailModal.branch_id || detailModal.branches?.id) ||
      detailEdit.start_time !== (detailModal.start_time || '').substring(0, 5) ||
      detailEdit.end_time !== (detailModal.end_time || '').substring(0, 5) ||
      detailEdit.employee_id !== (detailModal.employee_id || detailModal.employees?.id) ||
      detailEdit.notes !== (detailModal.notes || '')
    );
  }, [detailModal, detailEdit]);

  // Date options
  const dateOptions = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dateOptions.push({
      value: toDateStr(d),
      label: `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    });
  }

  // Get bookings for a specific day and hour
  const getBookingsForSlot = (dateStr, hour) => {
    return bookings.filter(b => {
      if (b.booking_date !== dateStr) return false;
      const startMin = timeToMinutes(b.start_time);
      const endMin = timeToMinutes(b.end_time);
      const slotStart = hour * 60;
      const slotEnd = (hour + 1) * 60;
      return startMin < slotEnd && endMin > slotStart;
    });
  };

  // Calculate event position
  const getEventStyle = (booking, hour) => {
    const startMin = timeToMinutes(booking.start_time);
    const endMin = timeToMinutes(booking.end_time);
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;

    const top = Math.max(0, startMin - hourStart);
    const bottom = Math.min(60, endMin - hourStart);
    const height = bottom - top;

    // Only render in the first hour of the event
    if (startMin < hourStart) return null;

    const durationHours = (endMin - startMin) / 60;

    return {
      top: `${(top / 60) * 100}%`,
      height: `${durationHours * 100}%`,
      minHeight: `${Math.max(height / 60 * 100, 20)}%`
    };
  };

  // Week header label
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}/${weekDates[6].getFullYear()}`;
  const todayStr = toDateStr(new Date());

  return (
    <div className='full-view' style={{ '--staff-count': employees.length, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
      {/* Calendar Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-toolbar-wrap">
          <div className="cal-toolbar-left">
            <span className="cal-week-label">
              {currentDate.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button className="btn-icon" onClick={goPrev} title="Ngày trước"><FiChevronLeft /></button>
            <button className="btn-icon" onClick={goNext} title="Ngày sau"><FiChevronRight /></button>
            <button className="btn btn-sm btn-ghost" style={{ fontSize: 15, fontWeight: 500 }} onClick={goToday}>Hôm nay</button>
          </div>
          <div className="cal-toolbar-right">
            <div className="cal-view-toggle">
              <button className={`cal-view-btn${viewMode === 'calendar' ? ' active' : ''}`} onClick={() => setViewMode('calendar')}>
                <FiCalendar size={14} />
              </button>
              <button className={`cal-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>
                <FiList size={14} />
              </button>
            </div>
            <select className="form-select" style={{ maxWidth: 200 }}
              value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => openBookingModal()}>
              <FiPlus />
            </button>
          </div>
        </div>
        {viewMode === 'calendar' && (
          <div className="cal-staff-header-wrap">
            {/* Header row */}
            <div className="cal-staff-header"></div>
            {employees.map(emp => {
              const empSched = employeeSchedules.find(s => s.employee_id === emp.id);
              const isAvailable = empSched && !empSched.is_day_off;
              return (
                <div
                  key={emp.id}
                  className="cal-staff-header"
                  style={{ backgroundColor: isAvailable ? '#FFFFFF' : '#FAFAFA' }}
                >
                  {emp.name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <div className="cal-container">

          <div className='calendar-grid'>
            {/* Time labels column */}
            <div className="cal-time-column">
              {HOURS.map(hour => (
                <div key={hour} className="cal-time-slot">
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Staff columns */}
            {employees.map(emp => {
              const empSched = employeeSchedules.find(s => s.employee_id === emp.id);
              const isAvailable = empSched && !empSched.is_day_off;

              return (
                <div
                  key={emp.id}
                  className="cal-staff-column"
                  style={{
                    backgroundColor: isAvailable ? 'transparent' : '#FAFAFA',
                    cursor: isAvailable ? 'pointer' : 'default'
                  }}
                  onClick={() => isAvailable && openBookingModal(toDateStr(currentDate), emp)}
                >
                  {/* Now Line (rendered in each column or once for the whole grid) */}
                  {toDateStr(currentDate) === toDateStr(now) && (
                    <div className="cal-now-line" style={{ top: `${(timeToMinutes(`${now.getHours()}:${now.getMinutes()}`) - OPEN_HOUR * 60) / 60 * 100}px` }}>
                      {/* We only show badge on the first column for cleaner UI */}
                      {employees.indexOf(emp) === 0 && (
                        <div className="cal-now-badge">{now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}</div>
                      )}
                    </div>
                  )}

                  {/* Bookings for this staff */}
                  {bookings.filter(b => (b.employee_id === emp.id || b.employees?.id === emp.id)).map(b => {
                    const startMin = timeToMinutes(b.start_time);
                    const endMin = timeToMinutes(b.end_time);
                    const top = (startMin - OPEN_HOUR * 60) / 60 * 100;
                    const height = (endMin - startMin) / 60 * 100;
                    const colors = STATUS_COLORS[b.status] || STATUS_COLORS.confirmed;

                    return (
                      <div
                        key={b.id}
                        className="cal-booking-card"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: colors.bg,
                          borderLeft: `4px solid ${colors.border}`,
                          color: colors.text,
                        }}
                        onClick={(e) => { e.stopPropagation(); handleOpenDetail(b); }}
                      >
                        <div className="cal-booking-time">{formatTime(b.start_time)}</div>
                        <div className="cal-booking-name">{b.customers?.name}</div>
                        <div className="cal-booking-service">{b.services?.name} - {b.services?.duration_minutes}p</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Dịch vụ</th>
                  <th>Chi nhánh</th>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Nhân viên</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th>Giá</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="empty-state">
                        <FiCalendar size={32} />
                        <h4>Không có lịch hẹn</h4>
                        <p>Chưa có lịch hẹn nào trong tuần này</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map(b => (
                      <tr key={b.id} onClick={() => handleOpenDetail(b)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.customers?.name || '-'}</div>
                          <div style={{ fontSize: 12, color: '#afafaf' }}>{b.customers?.phone}</div>
                        </td>
                        <td>{b.services?.name || '-'}</td>
                        <td>{b.branches?.name || '-'}</td>
                        <td>{new Date(b.booking_date + 'T00:00:00').toLocaleDateString('vi-VN')}</td>
                        <td>{formatTime(b.start_time)} - {formatTime(b.end_time)}</td>
                        <td>{b.employees?.name || '-'}</td>
                        <td>{b.notes || '-'}</td>
                        <td>
                          <span className={`badge badge-${b.status}`}>{b.status}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatPrice(b.total_price)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="pagination-container">
            <div className="items-per-page">
              <span>Hiển thị</span>
              <select className="ipp-select" value={itemsPerPage} onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>kết quả mỗi trang</span>
            </div>
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><HiOutlineChevronLeft /></button>
              {Array.from({ length: Math.ceil(bookings.length / itemsPerPage) }, (_, i) => (
                <button
                  key={i + 1}
                  className={`page-btn${currentPage === i + 1 ? ' active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(bookings.length / itemsPerPage), currentPage + 2))}
              <button className="page-btn" disabled={currentPage >= Math.ceil(bookings.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}><HiOutlineChevronRight /></button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal modal-viewing" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ paddingBottom: 0 }}>
              <h3 style={{ fontSize: '24px', fontWeight: 700 }}>Chi tiết</h3>
              <button className="modal-close" onClick={() => setDetailModal(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 5L5 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M5 5L19 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>
            </div>

            <div className="detail-tabs">
              <button
                className={`tab-btn ${detailTab === 'schedule' ? 'active' : ''}`}
                onClick={() => setDetailTab('schedule')}
                style={{
                  color: detailTab === 'schedule' ? '#000' : '#888',
                  borderBottom: detailTab === 'schedule' ? '2px solid #000' : 'none'
                }}
              >
                Lịch
              </button>
              <button
                className={`tab-btn ${detailTab === 'customer' ? 'active' : ''}`}
                onClick={() => setDetailTab('customer')}
                style={{ color: detailTab === 'customer' ? '#000' : '#888', borderBottom: detailTab === 'customer' ? '2px solid #000' : 'none' }}
              >
                Khách
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: 0 }}>
              {detailTab === 'schedule' ? (
                <div className="detail-view">
                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#0d8a3f' }}></div>
                    </div>
                    <div className="booking-row-content">
                      <select
                        className="form-select"
                        style={{ border: 'none', padding: 0, fontSize: '16px', fontWeight: 500 }}
                        value={detailEdit.service_id}
                        onChange={e => {
                          const newServiceId = e.target.value;
                          const newDuration = services.find(s => s.id === newServiceId)?.duration_minutes || 0;
                          setDetailEdit(f => ({
                            ...f,
                            service_id: newServiceId,
                            end_time: calculateEndTime(f.start_time, newDuration)
                          }));
                        }}
                      >
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={clockIcon} alt="time" style={{ width: 20 }} />
                    </div>
                    <div className="booking-row-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>
                        {new Date(detailModal.booking_date).getDate()}, Tháng {new Date(detailModal.booking_date).getMonth() + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TimePicker
                          value={detailEdit.start_time}
                          onChange={val => setDetailEdit(f => ({
                            ...f,
                            start_time: val,
                            end_time: calculateEndTime(val, services.find(s => s.id === f.service_id)?.duration_minutes || 0)
                          }))}
                          bookingDate={detailModal.booking_date}
                        />
                        <span style={{ fontSize: '16px', color: '#afafaf' }}>—</span>
                        <TimePicker
                          value={detailEdit.end_time}
                          onChange={val => setDetailEdit(f => ({ ...f, end_time: val }))}
                          bookingDate={detailModal.booking_date}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <div className="customer-avatar" style={{ transform: 'scale(1.2)' }}>{detailModal.customers?.name?.charAt(0) || 'T'}</div>
                    </div>
                    <div className="booking-row-content" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>{detailModal.customers?.name}</div>
                      <div style={{ fontSize: '15px', color: '#888' }}>{detailModal.customers?.phone}</div>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={shopIcon} alt="branch" style={{ width: 20 }} />
                    </div>
                    <div className="booking-row-content">
                      <select
                        className="form-select"
                        style={{ border: 'none', padding: 0, fontSize: '16px', fontWeight: 500 }}
                        value={detailEdit.branch_id}
                        onChange={e => setDetailEdit(f => ({ ...f, branch_id: e.target.value }))}
                      >
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <div className="customer-avatar" style={{ transform: 'scale(1.2)', background: '#eee', color: '#999' }}>{detailModal.employees?.name?.charAt(0) || 'A'}</div>
                    </div>
                    <div className="booking-row-content">
                      <select
                        className="form-select"
                        style={{ border: 'none', padding: 0, fontSize: '16px', fontWeight: 500 }}
                        value={detailEdit.employee_id}
                        onChange={e => setDetailEdit(f => ({ ...f, employee_id: e.target.value }))}
                      >
                        {employeesByBranch.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={noteIcon} alt="note" style={{ width: 20 }} />
                    </div>
                    <div className="booking-row-content">
                      <input
                        type="text"
                        className="form-input"
                        style={{ border: 'none', padding: 0, fontSize: '16px', fontWeight: 500 }}
                        value={detailEdit.notes}
                        onChange={e => setDetailEdit(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Thêm ghi chú"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="customer-view">
                  <div style={{ textAlign: 'center', margin: '16px 0 32px' }}>
                    <div className="customer-avatar" style={{ width: 80, height: 80, fontSize: '32px', margin: '0 auto 16px' }}>
                      {detailModal.customers?.name?.charAt(4) || 'A'}
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{detailModal.customers?.name}</h2>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <div className="booking-row-content">
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>{detailModal.customers?.name}</div>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>
                    <div className="booking-row-content">
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>{detailModal.customers?.phone}</div>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                    <div className="booking-row-content">
                      <div style={{ fontSize: '16px', color: '#888' }}>{detailModal.email || "Không có email"}</div>
                    </div>
                  </div>

                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={noteIcon} alt="note" style={{ width: 24 }} />
                    </div>
                    <div className="booking-row-content">
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>{detailModal.notes || "Không có ghi chú"}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer modal-viewing">
              <button
                className="btn-trash"
                onClick={() => handleCancel(detailModal.id)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveDetail}
                disabled={detailSaving || !isDetailModified}
                style={{ borderRadius: '40px', padding: '12px 32px', fontSize: '16px', fontWeight: 600, background: isDetailModified ? '#000' : '#dcdcdc', color: '#fff', border: 'none' }}
              >
                {detailSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Create Booking Modal */}
      {
        modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Đặt lịch</h3>
                <button className="modal-close" onClick={() => setModalOpen(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 5L5 19" stroke="black" stroke-miterlimit="10"></path>
                    <path d="M5 5L19 19" stroke="black" stroke-miterlimit="10"></path>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleBookSubmit}>
                <div className="modal-body">
                  {/* 1 Row: Dịch vụ */}
                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <FiCalendar style={{ color: selectedService ? '#333' : '#afafaf' }} />
                    </div>
                    <div className="booking-row-content">
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{
                            border: !bookForm.service_id && bookForm.service_search ? '1px solid #ff4d4f' : 'none',
                            fontSize: '16px',
                            fontWeight: 500,
                            boxShadow: 'none'
                          }}
                          value={bookForm.service_search}
                          onChange={e => {
                            handleGenericSearch('service', e.target.value);
                            if (bookForm.service_id) setBookForm(prev => ({ ...prev, service_id: '' }));
                          }}
                          onFocus={() => handleGenericSearch('service', bookForm.service_search)}
                          onBlur={() => setTimeout(() => setSearchSuggestions({ type: null, data: [], loading: false }), 200)}
                          placeholder="Chọn Dịch Vụ"
                          autoComplete="off"
                        />
                        {searchSuggestions.type === 'service' && searchSuggestions.loading && (
                          <div className="spinner-icon" style={{ position: 'absolute', right: 0, top: '50%', marginTop: '-9px' }} />
                        )}
                        {searchSuggestions.type === 'service' && searchSuggestions.data.length > 0 && (
                          <div className="autocomplete-dropdown">
                            {searchSuggestions.data.map(s => (
                              <div key={s.id} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion('service', s)}>
                                <div className="customer-avatar" style={{ background: '#eee', color: '#666' }}>{s.name.charAt(0)}</div>
                                <div className="customer-info">
                                  <div className="autocomplete-name">{s.name}</div>
                                  <div className="customer-phone">{formatPrice(s.price)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1 Row: Ngày & Giờ */}
                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={clockIcon} alt="date" />
                    </div>
                    <div className="booking-row-content" style={{ display: 'flex', gap: 16 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type="text"
                          className="form-input"
                          readOnly
                          style={{ border: 'none', width: '100%', boxShadow: 'none', cursor: 'pointer' }}
                          value={bookForm.booking_date ? new Date(bookForm.booking_date).toLocaleDateString('vi-VN') : '--/--/----'}
                          onClick={() => setShowCalendar(!showCalendar)}
                        />
                        {showCalendar && (
                          <div style={{ position: 'absolute', top: '105%', left: 0, zIndex: 100, background: 'white', border: '1px solid #efefef', borderRadius: 12, padding: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <DatePicker.Root
                              selectionMode="single"
                              hideOutsideDays
                              inline
                              width="fit-content"
                              value={bookForm.booking_date ? [parseDate(bookForm.booking_date)] : []}
                              onValueChange={(details) => {
                                if (details.value[0]) {
                                  const d = details.value[0];
                                  const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                                  setBookForm(f => ({ ...f, booking_date: dateStr }));
                                  setShowCalendar(false);
                                }
                              }}
                            >
                              <DatePicker.Content unstyled>
                                <DatePicker.View view="day">
                                  <DatePicker.Header />
                                  <DatePicker.DayTable />
                                </DatePicker.View>
                                <DatePicker.View view="month">
                                  <DatePicker.Header />
                                  <DatePicker.MonthTable />
                                </DatePicker.View>
                                <DatePicker.View view="year">
                                  <DatePicker.Header />
                                  <DatePicker.YearTable />
                                </DatePicker.View>
                              </DatePicker.Content>
                            </DatePicker.Root>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <TimePicker
                          value={bookForm.start_time}
                          onChange={val => {
                            setBookForm(f => ({ ...f, start_time: val, end_time: calculateEndTime(val, selectedService?.duration_minutes || 0) }));
                          }}
                          bookingDate={bookForm.booking_date}
                        />
                        <span style={{ fontSize: '20px', color: '#afafaf' }}>—</span>
                        <TimePicker
                          value={bookForm.end_time}
                          onChange={val => setBookForm(f => ({ ...f, end_time: val }))}
                          bookingDate={bookForm.booking_date}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1 Row: Khách hàng */}
                  <div className="booking-row no-hover"
                    onClick={() => customerView === 'default' && setCustomerView('searching')}>
                    <div className="booking-row-icon">
                      {customerView === 'selected' || customerView === 'creating' ? (
                        <div className="customer-avatar" style={{ transform: 'scale(1.15)' }}>{bookForm.customer_name?.charAt(0).toUpperCase() || 'T'}</div>
                      ) : (
                        <img src={userIcon} alt="user" />
                      )}
                    </div>
                    <div className="booking-row-content">
                      {customerView === 'default' && <div className="booking-row-title" style={{ color: '#888888' }}>Thêm Khách</div>}

                      {customerView === 'searching' && (
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ border: '1px solid #333', fontSize: '16px', fontWeight: 500, borderRadius: '12px' }}
                            autoFocus
                            value={bookForm.customer_name}
                            onChange={e => handleGenericSearch('customer', e.target.value)}
                            onFocus={e => handleGenericSearch('customer', e.target.value)}
                            onBlur={() => setTimeout(() => {
                              if (customerView !== 'selected' && customerView !== 'creating' && !bookForm.customer_name) {
                                setCustomerView('default');
                              }
                            }, 200)}
                            placeholder="Nhập tên khách hàng hoặc số điện thoại..."
                            autoComplete="off"
                          />
                          {searchSuggestions.type === 'customer' && searchSuggestions.loading && (
                            <div className="spinner-icon" style={{ position: 'absolute', right: 12, top: '50%', marginTop: '-9px' }} />
                          )}
                          {searchSuggestions.type === 'customer' && (
                            <div className="autocomplete-dropdown">
                              {searchSuggestions.data.map(c => (
                                <div key={c.id} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion('customer', c)}>
                                  <div className="customer-avatar">{c.name.charAt(0)}</div>
                                  <div className="customer-info">
                                    <div className="autocomplete-name">{c.name}</div>
                                    <div className="customer-phone">{c.phone}</div>
                                  </div>
                                </div>
                              ))}
                              <div className="autocomplete-footer" onMouseDown={() => handleSelectSuggestion('customer', 'new')}>
                                <FiPlus /> Tạo Khách Mới
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {customerView === 'selected' && (
                        <div className="customer-info" onClick={() => setCustomerView('searching')}>
                          <div className="booking-row-title">{bookForm.customer_name}</div>
                          <div className="customer-phone">{bookForm.customer_phone}</div>
                        </div>
                      )}

                      {customerView === 'creating' && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <input className="form-input" style={{ border: 'none', padding: 16, fontWeight: 500, boxShadow: 'none' }} placeholder="Tên khách"
                            value={bookForm.customer_name} onChange={e => setBookForm(f => ({ ...f, customer_name: e.target.value }))} />
                          <input className="form-input" style={{ border: '1px solid #e0e0e0', padding: '6px 12px', borderRadius: '10px', width: '140px' }} placeholder="Nhập SĐT"
                            value={bookForm.customer_phone} onChange={e => setBookForm(f => ({ ...f, customer_phone: e.target.value }))} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1 Row: Chi nhánh */}
                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={shopIcon} alt="branch" />
                    </div>
                    <div className="booking-row-content">
                      <select className="form-select" style={{ border: 'none', background: 'none', fontSize: '16px', fontWeight: 500, boxShadow: 'none' }}
                        value={bookForm.branch_id} onChange={e => setBookForm(prev => ({ ...prev, branch_id: e.target.value }))}>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* 1 Row: Nhân viên */}
                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <div className="customer-avatar" style={{ transform: 'scale(1.2)', background: '#eee', color: '#999' }}>{bookForm.employee_search?.charAt(0) || 'A'}</div>
                    </div>
                    <div className="booking-row-content">
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ border: 'none', fontSize: '16px', fontWeight: 500, boxShadow: 'none' }}
                          value={bookForm.employee_search}
                          onChange={e => handleGenericSearch('employee', e.target.value)}
                          onFocus={e => handleGenericSearch('employee', e.target.value)}
                          onBlur={() => setTimeout(() => setSearchSuggestions({ type: null, data: [], loading: false }), 200)}
                          placeholder="Nhân Viên"
                          autoComplete="off"
                        />
                        {searchSuggestions.type === 'employee' && searchSuggestions.loading && (
                          <div className="spinner-icon" style={{ position: 'absolute', right: 0, top: '50%', marginTop: '-9px' }} />
                        )}
                        {searchSuggestions.type === 'employee' && searchSuggestions.data.length > 0 && (
                          <div className="autocomplete-dropdown">
                            {searchSuggestions.data.map(emp => (
                              <div key={emp.id} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion('employee', emp)}>
                                <div className="customer-avatar">{emp.name.charAt(0)}</div>
                                <div className="customer-info">
                                  <div className="autocomplete-name">{emp.name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1 Row: Ghi chú */}
                  <div className="booking-row no-hover">
                    <div className="booking-row-icon">
                      <img src={noteIcon} alt="notes" />
                    </div>
                    <div className="booking-row-content">
                      <input className="form-input" style={{ border: 'none', fontSize: '16px', fontWeight: 500, boxShadow: 'none' }}
                        placeholder="Notes" value={bookForm.notes} onChange={e => setBookForm({ ...bookForm, notes: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: '24px', background: '#111' }}>
                    Tạo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default Bookings;
