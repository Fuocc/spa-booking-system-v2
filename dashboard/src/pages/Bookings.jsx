import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { FiPlus, FiChevronLeft, FiChevronRight, FiCalendar, FiList } from 'react-icons/fi';
import { toast } from 'react-toastify'

import {
  getBookingsRange, getBookings, createBooking, updateBooking, updateBookingStatus, deleteBooking,
  getBranches, getServices, getAvailability, getEmployees, getCustomers
} from '../api';

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
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
      // Fetch bookings for the single day
      const data = await getBookingsRange(dayStr, dayStr, filterBranch || undefined);
      setBookings(data.filter(b => b.status !== 'cancelled'));

      // Also fetch employees for this branch if filtered
      if (filterBranch) {
        const emps = await getEmployees(filterBranch);
        setEmployees(emps.filter(e => e.is_active));
      } else {
        setEmployees([]);
      }
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

  const handleStatusChange = async (id, status) => {
    try {
      await updateBookingStatus(id, status);
      notify(`Đã cập nhật trạng thái: ${status}`);
      loadBookings();
      setDetailModal(null);
    } catch (err) {
      alert(err.message);
    }
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
  const openBookingModal = (preDate) => {
    setBookForm({
      branch_id: branches[0]?.id || '',
      service_id: '', num_guests: 1,
      customer_name: '', customer_phone: '', customer_email: '',
      booking_date: preDate || toDateStr(new Date()),
      start_time: '', notes: ''
    });
    setBookStep(1);
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

  const handleBookFormServiceChange = (serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    setSelectedService(svc);
    setBookForm(f => ({ ...f, service_id: serviceId, start_time: '' }));
    setAvailSlots([]);
  };

  const handleCustomerSearch = (val) => {
    setBookForm(prev => ({ ...prev, customer_name: val }));

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await getCustomers(val);
          setCustomerSuggestions(results);
          setShowSuggestions(true);
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 300);
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (c) => {
    setBookForm(prev => ({
      ...prev,
      customer_name: c.name,
      customer_phone: c.phone || '',
      customer_email: c.email || ''
    }));
    setShowSuggestions(false);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
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
      employee_id: booking.employee_id || booking.employees?.id || ''
    });

    try {
      const emps = await getEmployees(booking.branch_id);
      setEmployeesByBranch((emps || []).filter(e => e.is_active));
    } catch (e) {
      console.error(e);
      setEmployeesByBranch([]);
    }
  };

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
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', gap: 8 }}>

        </div>
      </div>

      {/* Calendar Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-toolbar-left">
          <span className="cal-week-label">
            {currentDate.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button className="btn-icon" onClick={goPrev} title="Ngày trước"><FiChevronLeft /></button>
          <button className="btn btn-sm btn-ghost" style={{ fontSize: 12, fontWeight: 500 }} onClick={goToday}>Hôm nay</button>
          <button className="btn-icon" onClick={goNext} title="Ngày sau"><FiChevronRight /></button>
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

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <div className="cal-container" style={{ '--staff-count': employees.length, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <div className="cal-staff-header-wrap">
            {/* Header row */}
            <div className="cal-staff-header"></div>
            {employees.map(emp => (
              <div key={emp.id} className="cal-staff-header">{emp.name}</div>
            ))}
          </div>
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
            {employees.map(emp => (
              <div key={emp.id} className="cal-staff-column" onClick={() => openBookingModal(toDateStr(currentDate))}>
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
            ))}
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
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&lt;</button>
              {Array.from({ length: Math.ceil(bookings.length / itemsPerPage) }, (_, i) => (
                <button
                  key={i + 1}
                  className={`page-btn${currentPage === i + 1 ? ' active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(bookings.length / itemsPerPage), currentPage + 2))}
              <button className="page-btn" disabled={currentPage >= Math.ceil(bookings.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>&gt;</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết lịch hẹn</h3>
              <button className="modal-close" onClick={() => setDetailModal(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 5L5 19" stroke="black" strokeMiterlimit="10"></path>
                  <path d="M5 5L19 19" stroke="black" strokeMiterlimit="10"></path>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Khách hàng</span><span className="detail-value">{detailModal.customers?.name}</span></div>
                <div className="detail-row"><span className="detail-label">SĐT</span><span className="detail-value">{detailModal.customers?.phone}</span></div>
                <div className="detail-row">
                  <span className="detail-label">Dịch vụ</span>
                  <select
                    className="detail-select"
                    value={detailEdit?.service_id || ''}
                    onChange={e => setDetailEdit(f => ({ ...f, service_id: e.target.value }))}
                  >
                    {services.filter(s => s.is_active).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes}p)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Chi nhánh</span>
                  <select
                    className="detail-select"
                    value={detailEdit?.branch_id || ''}
                    onChange={async (e) => {
                      const newBranchId = e.target.value;
                      setDetailEdit(f => ({ ...f, branch_id: newBranchId, employee_id: '' }));
                      try {
                        const emps = await getEmployees(newBranchId);
                        setEmployeesByBranch((emps || []).filter(x => x.is_active));
                      } catch (err) {
                        console.error(err);
                        setEmployeesByBranch([]);
                      }
                    }}
                  >
                    {branches.map(br => (
                      <option key={br.id} value={br.id}>{br.name}</option>
                    ))}
                  </select>
                </div>
                <div className="detail-row"><span className="detail-label">Ngày</span><span className="detail-value">{new Date(detailModal.booking_date + 'T00:00:00').toLocaleDateString('vi-VN')}</span></div>
                <div className="detail-row">
                  <span className="detail-label">Giờ</span>
                  <select
                    className="detail-select"
                    value={detailEdit?.start_time || ''}
                    onChange={e => setDetailEdit(f => ({ ...f, start_time: e.target.value }))}
                  >
                    {Array.from({ length: (22 - 10) * 4 }, (_, i) => {
                      const total = 10 * 60 + i * 15;
                      const hh = String(Math.floor(total / 60)).padStart(2, '0');
                      const mm = String(total % 60).padStart(2, '0');
                      const t = `${hh}:${mm}`;
                      return <option key={t} value={t}>{t}</option>;
                    })}
                  </select>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Nhân viên</span>
                  <select
                    className="detail-select"
                    value={detailEdit?.employee_id || ''}
                    onChange={e => setDetailEdit(f => ({ ...f, employee_id: e.target.value }))}
                  >
                    <option value="" disabled>Chọn nhân viên</option>
                    {employeesByBranch.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="detail-row"><span className="detail-label">Giường</span><span className="detail-value">{detailModal.beds?.name}</span></div>
                <div className="detail-row"><span className="detail-label">Giá</span><span className="detail-value" style={{ fontWeight: 700 }}>{formatPrice(detailModal.total_price)}</span></div>
                <div className="detail-row">
                  <span className="detail-label">Trạng thái</span>
                  <select
                    className={`badge badge-${detailModal.status}`}
                    value={detailModal.status}
                    onChange={e => handleStatusChange(detailModal.id, e.target.value)}
                    style={{ border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '8px', borderRadius: 5 }}
                  >
                    <option value="pending">Đang chờ</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>
                {detailModal.notes && (
                  <div className="detail-row"><span className="detail-label">Ghi chú</span><span className="detail-value">{detailModal.notes}</span></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-sm btn-danger" onClick={() => handleCancel(detailModal.id)}>Hủy lịch</button>
              <button className="btn btn-sm btn-primary" onClick={handleSaveDetail} disabled={detailSaving}>
                {detailSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Đặt lịch mới</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 5L5 19" stroke="black" stroke-miterlimit="10"></path>
                  <path d="M5 5L19 19" stroke="black" stroke-miterlimit="10"></path>
                </svg>
              </button>
            </div>
            <form onSubmit={handleBookSubmit}>
              <div className="modal-body">
                {bookStep === 1 && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Chi nhánh</label>
                        <select className="form-select" value={bookForm.branch_id}
                          onChange={e => setBookForm(prev => ({ ...prev, branch_id: e.target.value }))} required>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Số người</label>
                        <select className="form-select" value={bookForm.num_guests}
                          onChange={e => setBookForm(prev => ({ ...prev, num_guests: parseInt(e.target.value) }))}>
                          <option value={1}>1 người</option>
                          <option value={2}>2 người</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dịch vụ</label>
                      <select className="form-select" value={bookForm.service_id}
                        onChange={e => handleBookFormServiceChange(e.target.value)} required>
                        <option value="">Chọn dịch vụ</option>
                        {services.filter(s => s.is_active).map(s => (
                          <option key={s.id} value={s.id}>{s.name} - {formatPrice(s.price)} ({s.duration_minutes}p)</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="form-label">Tên khách hàng</label>
                      <input
                        type="text"
                        className="form-input"
                        value={bookForm.customer_name}
                        onChange={e => handleCustomerSearch(e.target.value)}
                        onFocus={() => bookForm.customer_name && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Nhập tên hoặc số điện thoại..."
                        autoComplete="off"
                        required
                      />
                      {showSuggestions && customerSuggestions.length > 0 && (
                        <div className="autocomplete-dropdown">
                          {customerSuggestions.map(c => (
                            <div key={c.id} className="autocomplete-item" onMouseDown={() => selectCustomer(c)}>
                              <div className="autocomplete-avatar">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="autocomplete-info">
                                <div className="autocomplete-name">{c.name}</div>
                                <div className="autocomplete-sub">{c.phone} {c.email ? `• ${c.email}` : ''}</div>
                              </div>
                            </div>
                          ))}
                          <div className="autocomplete-footer">
                            + Thêm khách hàng mới
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Số điện thoại</label>
                        <input type="tel" className="form-input" value={bookForm.customer_phone}
                          onChange={e => setBookForm(prev => ({ ...prev, customer_phone: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email (tùy chọn)</label>
                        <input type="email" className="form-input" value={bookForm.customer_email}
                          onChange={e => setBookForm(prev => ({ ...prev, customer_email: e.target.value }))} />
                      </div>
                    </div>
                  </>
                )}

                {bookStep === 2 && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Ngày</label>
                      <select className="form-select" value={bookForm.booking_date}
                        onChange={e => {
                          setBookForm(prev => ({ ...prev, booking_date: e.target.value, start_time: '' }));
                          setAvailSlots([]);
                        }}>
                        {dateOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <button type="button" className="btn btn-sm btn-secondary"
                        onClick={loadAvailability} disabled={slotsLoading}>
                        {slotsLoading ? 'Đang tải...' : 'Xem khung giờ trống'}
                      </button>
                    </div>
                    {availSlots.length > 0 && (
                      <div>
                        <label className="form-label">Chọn giờ</label>
                        <div className="time-slots-grid-modal">
                          {availSlots.map(slot => (
                            <button key={slot.start_time} type="button"
                              className={`time-slot-modal${!slot.available ? ' disabled' : ''}${bookForm.start_time === slot.start_time ? ' selected' : ''}`}
                              disabled={!slot.available}
                              onClick={() => setBookForm({ ...bookForm, start_time: slot.start_time })}>
                              {slot.start_time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label className="form-label">Ghi chú</label>
                      <textarea className="form-input" rows={2} value={bookForm.notes}
                        onChange={e => setBookForm({ ...bookForm, notes: e.target.value })}
                        style={{ resize: 'vertical' }} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {bookStep > 1 && (
                  <button type="button" className="btn btn-secondary" onClick={() => setBookStep(s => s - 1)}>Quay lại</button>
                )}
                {bookStep < 2 ? (
                  <button type="button" className="btn btn-primary"
                    onClick={() => {
                      if (!bookForm.branch_id || !bookForm.service_id || !bookForm.customer_name || !bookForm.customer_phone) {
                        alert('Vui lòng điền đầy đủ thông tin');
                        return;
                      }
                      setBookStep(2);
                    }}>Tiếp tục</button>
                ) : (
                  <button type="submit" className="btn btn-primary" disabled={!bookForm.start_time}>Xác nhận đặt lịch</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bookings;
