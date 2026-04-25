import { useState, useEffect, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import { getEmployees, getEmployeeSchedules, createBulkSchedule, deleteEmployeeSchedule, getBranches } from '../api';
import { toast } from 'react-toastify'

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function EmployeeSchedules() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    employee_id: '', start_time: '10:00', end_time: '20:00',
    is_day_off: false, note: '', selectedDays: []
  });

  const [creatingDefault, setCreatingDefault] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const notify = (msg) => {
    toast.success(msg, {
      position: "bottom-right"
    });
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, filterBranch]);

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      const from = toDateStr(weekDates[0]);
      const to = toDateStr(weekDates[6]);
      const [empData, schedData] = await Promise.all([
        getEmployees(filterBranch || undefined),
        getEmployeeSchedules({ date_from: from, date_to: to })
      ]);
      setEmployees(empData.filter(e => e.is_active));
      setSchedules(schedData);
    } catch (err) {
      console.error(err);
    }
  };

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const goNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };

  const getSchedule = (empId, dateStr) => {
    return schedules.find(s => s.employee_id === empId && s.date === dateStr);
  };

  const openScheduleModal = (empId) => {
    setScheduleForm({
      employee_id: empId || employees[0]?.id || '',
      start_time: '10:00', end_time: '20:00',
      is_day_off: false, note: '', selectedDays: []
    });
    setModalOpen(true);
  };

  const toggleDay = (dateStr) => {
    setScheduleForm(f => ({
      ...f,
      selectedDays: f.selectedDays.includes(dateStr)
        ? f.selectedDays.filter(d => d !== dateStr)
        : [...f.selectedDays, dateStr]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (scheduleForm.selectedDays.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ngày');
      return;
    }
    try {
      await createBulkSchedule({
        employee_id: scheduleForm.employee_id,
        dates: scheduleForm.selectedDays,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        is_day_off: scheduleForm.is_day_off,
        note: scheduleForm.note
      });
      setModalOpen(false);
      notify(`Thêm lịch làm thành công`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Xóa lịch này?')) return;
    try {
      await deleteEmployeeSchedule(id);
      notify(`Xóa lịch làm thành công`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // NEW: create default schedules 10:00-20:00 for ALL employees in current month
  const createDefaultSchedulesForMonth = async () => {
    if (employees.length === 0) {
      alert('Chưa có nhân viên');
      return;
    }

    if (!confirm('Tạo lịch mặc định 10:00 - 20:00 cho TẤT CẢ nhân viên trong tháng này?')) return;

    setCreatingDefault(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month, i + 1);
        return toDateStr(d);
      });

      // Create schedules for each employee (bulk per employee)
      // API createBulkSchedule does upsert on (employee_id,date) so safe to run multiple times.
      for (const emp of employees) {
        await createBulkSchedule({
          employee_id: emp.id,
          dates,
          start_time: '10:00',
          end_time: '20:00',
          is_day_off: false,
          note: null
        });
      }

      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingDefault(false);
    }
  };

  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}/${weekDates[6].getFullYear()}`;
  const todayStr = toDateStr(new Date());

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch nhân viên</h1>
          <p className="page-subtitle">Quản lý lịch làm việc, ca làm, ngày nghỉ</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={createDefaultSchedulesForMonth} disabled={creatingDefault}>
            {creatingDefault ? 'Đang tạo mặc định...' : 'Tạo lịch mặc định (10:00-20:00)'}
          </button>
          <button className="btn btn-primary" onClick={() => openScheduleModal()}>
            <FiPlus /> Xếp lịch
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-toolbar-left">
          <button className="btn btn-sm btn-secondary" onClick={goToday}>Hôm nay</button>
          <button className="btn btn-sm btn-ghost" onClick={goPrev}><FiChevronLeft /></button>
          <button className="btn btn-sm btn-ghost" onClick={goNext}><FiChevronRight /></button>
          <span className="cal-week-label">{weekLabel}</span>
        </div>
        <div className="cal-toolbar-right">
          <select className="form-select" style={{ maxWidth: 200, padding: '6px 12px', fontSize: 13 }}
            value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="schedule-emp-col">Nhân viên</th>
              {weekDates.map(d => {
                const ds = toDateStr(d);
                const isToday = ds === todayStr;
                return (
                  <th key={ds} className={`schedule-day-col${isToday ? ' today' : ''}`}>
                    <span className="cal-day-name">{DAY_NAMES[d.getDay()]}</span>
                    <span className={`cal-day-num${isToday ? ' today' : ''}`}>{d.getDate()}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#afafaf' }}>
                  Chưa có nhân viên
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td className="schedule-emp-name">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: '#afafaf' }}>{emp.branches?.name}</div>
                  </td>
                  {weekDates.map(d => {
                    const ds = toDateStr(d);
                    const sched = getSchedule(emp.id, ds);
                    const isToday = ds === todayStr;

                    return (
                      <td key={ds} className={`schedule-cell${isToday ? ' today' : ''}`}
                        onClick={() => {
                          setScheduleForm(f => ({
                            ...f,
                            employee_id: emp.id,
                            selectedDays: [ds]
                          }));
                          setModalOpen(true);
                        }}>
                        {sched ? (
                          <div className={`schedule-badge ${sched.is_day_off ? 'day-off' : 'working'}`}
                            onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(sched.id); }}>
                            {sched.is_day_off ? (
                              <span>Nghỉ</span>
                            ) : (
                              <span>{sched.start_time?.substring(0, 5)} - {sched.end_time?.substring(0, 5)}</span>
                            )}
                            {sched.note && <div className="schedule-note">{sched.note}</div>}
                          </div>
                        ) : (
                          <div className="schedule-empty">+</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xếp lịch làm việc</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nhân viên</label>
                  <select className="form-select" value={scheduleForm.employee_id}
                    onChange={e => setScheduleForm({ ...scheduleForm, employee_id: e.target.value })} required>
                    <option value="">Chọn nhân viên</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.branches?.name})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Chọn ngày (bấm để chọn/bỏ chọn)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {weekDates.map(d => {
                      const ds = toDateStr(d);
                      const selected = scheduleForm.selectedDays.includes(ds);
                      return (
                        <button key={ds} type="button"
                          className={`schedule-day-btn${selected ? ' selected' : ''}`}
                          onClick={() => toggleDay(ds)}>
                          {DAY_NAMES[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={scheduleForm.is_day_off}
                      onChange={e => setScheduleForm({ ...scheduleForm, is_day_off: e.target.checked })} />
                    Ngày nghỉ
                  </label>
                </div>

                {!scheduleForm.is_day_off && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Giờ bắt đầu</label>
                      <input type="time" className="form-input" value={scheduleForm.start_time}
                        onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Giờ kết thúc</label>
                      <input type="time" className="form-input" value={scheduleForm.end_time}
                        onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <input type="text" className="form-input" value={scheduleForm.note}
                    onChange={e => setScheduleForm({ ...scheduleForm, note: e.target.value })}
                    placeholder="VD: Ca sáng, Học thêm..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lịch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeSchedules;