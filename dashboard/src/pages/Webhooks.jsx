import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiZap, FiPlay } from 'react-icons/fi';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } from '../api';

function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', event: 'booking.confirmed', is_active: true });
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const data = await getWebhooks();
      setWebhooks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', url: '', event: 'booking.confirmed', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (webhook) => {
    setEditing(webhook);
    setForm({ name: webhook.name, url: webhook.url, event: webhook.event, is_active: webhook.is_active });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateWebhook(editing.id, form);
      } else {
        await createWebhook(form);
      }
      setModalOpen(false);
      loadWebhooks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa webhook này?')) return;
    try {
      await deleteWebhook(id);
      loadWebhooks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTest = async (id) => {
    setTestResult(null);
    try {
      const result = await testWebhook(id);
      setTestResult({ id, ...result });
      setTimeout(() => setTestResult(null), 5000);
    } catch (err) {
      setTestResult({ id, success: false, message: err.message });
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleToggle = async (webhook) => {
    try {
      await updateWebhook(webhook.id, { ...webhook, is_active: !webhook.is_active });
      loadWebhooks();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">Cấu hình webhook cho Zapier / automation</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Thêm Webhook
        </button>
      </div>

      {/* Info card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fef3e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FiZap size={20} style={{ color: '#e67e22' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tích hợp Zapier</div>
            <div style={{ fontSize: 13, color: '#4b4b4b', lineHeight: 1.6 }}>
              Tạo Zap trên Zapier → chọn trigger "Webhooks by Zapier" → "Catch Hook" → copy URL vào đây.
              Mỗi khi có booking mới được xác nhận, hệ thống sẽ tự động gửi dữ liệu đến URL này.
              Bạn có thể dùng Zapier để gửi SMS, email, hoặc tạo sự kiện Google Calendar.
            </div>
          </div>
        </div>
      </div>

      {/* Webhook payload preview */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Payload mẫu</h3>
        </div>
        <div className="card-body">
          <pre style={{ fontSize: 12, background: '#f7f7f7', padding: 16, borderRadius: 8, overflow: 'auto', lineHeight: 1.5 }}>
{`{
  "event": "booking.confirmed",
  "timestamp": "2026-04-18T10:00:00.000Z",
  "data": {
    "booking_id": "uuid-here",
    "customer_name": "Nguyễn Văn A",
    "customer_phone": "0901234567",
    "customer_email": "email@example.com",
    "service_name": "Massage Body Thư Giãn",
    "service_duration": 60,
    "service_price": 400000,
    "employee_name": "Nhân viên 1",
    "branch_name": "Chi nhánh 1",
    "booking_date": "2026-04-20",
    "start_time": "10:00",
    "end_time": "11:00",
    "status": "confirmed",
    "total_price": 400000
  }
}`}
          </pre>
        </div>
      </div>

      {/* Webhooks list */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>URL</th>
                <th>Sự kiện</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <FiZap size={32} />
                      <h4>Chưa có webhook</h4>
                      <p>Thêm webhook đầu tiên để tích hợp Zapier</p>
                    </div>
                  </td>
                </tr>
              ) : (
                webhooks.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>
                      <code style={{ fontSize: 12, background: '#f7f7f7', padding: '2px 6px', borderRadius: 4, wordBreak: 'break-all' }}>
                        {w.url}
                      </code>
                    </td>
                    <td><span className="badge badge-confirmed">{w.event}</span></td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <div className={`toggle-switch${w.is_active ? ' active' : ''}`}
                          onClick={() => handleToggle(w)}>
                          <div className="toggle-knob"></div>
                        </div>
                        <span style={{ fontSize: 12, color: w.is_active ? '#0d8a3f' : '#afafaf' }}>
                          {w.is_active ? 'Bật' : 'Tắt'}
                        </span>
                      </label>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon" onClick={() => handleTest(w.id)} title="Test">
                          <FiPlay size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => openEdit(w)} title="Sửa">
                          <FiEdit2 size={14} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(w.id)} title="Xóa">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                      {testResult?.id === w.id && (
                        <div style={{ fontSize: 12, marginTop: 6, color: testResult.success ? '#0d8a3f' : '#d32f2f' }}>
                          {testResult.success ? '✅ Test thành công' : `❌ ${testResult.message}`}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa Webhook' : 'Thêm Webhook'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên</label>
                  <input type="text" className="form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Zapier Nhắc lịch SMS" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Webhook URL</label>
                  <input type="url" className="form-input" value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                    placeholder="https://hooks.zapier.com/hooks/catch/..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sự kiện trigger</label>
                  <select className="form-select" value={form.event}
                    onChange={e => setForm({ ...form, event: e.target.value })}>
                    <option value="booking.confirmed">Booking xác nhận</option>
                    <option value="booking.completed">Booking hoàn thành</option>
                    <option value="booking.cancelled">Booking hủy</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Webhooks;
