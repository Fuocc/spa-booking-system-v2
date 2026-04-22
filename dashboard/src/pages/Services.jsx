import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getServices, createService, updateService, deleteService } from '../api';
import { toast } from 'react-toastify'


function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 60, price: 0, is_active: true });

  const notify = (msg) => {
    toast.success(msg, {
      position: "bottom-right"
    });
  };

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', duration_minutes: 60, price: 0, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      description: svc.description || '',
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      is_active: svc.is_active
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: parseInt(form.price), duration_minutes: parseInt(form.duration_minutes) };
      if (editing) {
        await updateService(editing.id, payload);
        notify(`Cập nhật ${editing.name} thành công`);
      } else {
        await createService(payload);
        notify('Thêm dịch vụ mới thành công');
      }
      setModalOpen(false);
      loadServices();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn vô hiệu hóa dịch vụ này?')) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dịch vụ</h1>
          <p className="page-subtitle">Quản lý danh sách dịch vụ spa</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Thêm dịch vụ
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên dịch vụ</th>
                <th>Mô tả</th>
                <th>Thời lượng</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <h4>Chưa có dịch vụ</h4>
                    </div>
                  </td>
                </tr>
              ) : (
                services.map(svc => (
                  <tr key={svc.id}>
                    <td style={{ fontWeight: 600 }}>{svc.name}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {svc.description || '—'}
                    </td>
                    <td>{svc.duration_minutes} phút</td>
                    <td style={{ fontWeight: 600 }}>{formatPrice(svc.price)}</td>
                    <td>
                      <span className={`badge ${svc.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {svc.is_active ? 'Hoạt động' : 'Ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon" onClick={() => openEdit(svc)}><FiEdit2 size={14} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(svc.id)}><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 5L5 19" stroke="black" stroke-miterlimit="10"></path>
                  <path d="M5 5L19 19" stroke="black" stroke-miterlimit="10"></path>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên dịch vụ</label>
                  <input type="text" className="form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-input" rows={3} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    style={{ resize: 'vertical' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Thời lượng (phút)</label>
                    <input type="number" className="form-input" value={form.duration_minutes}
                      onChange={e => setForm({ ...form, duration_minutes: e.target.value })} min="15" step="5" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giá (VNĐ)</label>
                    <input type="number" className="form-input" value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })} min="0" step="1000" required />
                  </div>
                </div>
                {editing && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={form.is_active}
                        onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                      Đang hoạt động
                    </label>
                  </div>
                )}
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

export default Services;
