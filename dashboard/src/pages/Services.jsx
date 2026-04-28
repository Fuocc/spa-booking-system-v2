import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEdit3, FiFileText, FiClock, FiDollarSign, FiFolder, FiChevronDown } from 'react-icons/fi';
import { getServices, createService, updateService, deleteService } from '../api';
import { toast } from 'react-toastify';
import '../styles/services.css';

const CATEGORIES = ["Gội Đầu", "Massage", "Combo", "4 Tay", "Dịch vụ thêm"];
const COLORS = [
  '#25836B', // Teal
  '#E6A02A', // Orange
  '#EDD3A9', // Yellow/Gold
  '#F8F3EC', // Cream
  '#DDD6FE', // Light Purple
  '#FECDD3', // Light Pink
  '#BBF7D0', // Light Green
  '#BBC6C0'  // Grey
];

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 0,
    price: 0,
    is_active: true,
    category: '',
    color: COLORS[0]
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const colorPickerRef = useRef(null);
  const categoryRef = useRef(null);

  useEffect(() => {
    loadServices();

    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setForm({
      name: '',
      description: '',
      duration_minutes: 0,
      price: 0,
      is_active: true,
      category: '',
      color: COLORS[0]
    });
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      description: svc.description || '',
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      is_active: svc.is_active,
      category: svc.category || CATEGORIES[0],
      color: svc.color || COLORS[0]
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name || !form.price || !form.duration_minutes) return;

    try {
      const payload = {
        ...form,
        price: parseInt(form.price),
        duration_minutes: parseInt(form.duration_minutes)
      };
      if (editing) {
        await updateService(editing.id, payload);
        toast.success(`Cập nhật ${editing.name} thành công`);
      } else {
        await createService(payload);
        toast.success('Thêm dịch vụ mới thành công');
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

  const isFormValid = form.name && form.price > 0 && form.duration_minutes > 0;

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
                <th>Màu</th>
                <th>Tên dịch vụ</th>
                <th>Nhóm</th>
                <th>Thời lượng</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <h4>Chưa có dịch vụ</h4>
                    </div>
                  </td>
                </tr>
              ) : (
                services.map(svc => (
                  <tr key={svc.id}>
                    <td>
                      <div className="service-color-dot" style={{ background: svc.color || '#ddd' }}></div>
                    </td>
                    <td className="service-text-bold">{svc.name}</td>
                    <td><span className="badge badge-info">{svc.category || null}</span></td>
                    <td>{svc.duration_minutes} phút</td>
                    <td className="service-text-bold">{formatPrice(svc.price)}</td>
                    <td>
                      <span className={`badge ${svc.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {svc.is_active ? 'Hoạt động' : 'Ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon" onClick={() => openEdit(svc)}><FiEdit2 size={14} /></button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(svc.id)}><FiTrash2 size={14} /></button>
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
          <div className="modal service-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header service-modal-header">
              <h3 className="service-modal-title">{editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <FiPlus className="service-modal-close-icon" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body service-modal-body">
                {/* Tên dịch vụ */}
                <div className="service-form-group">
                  <FiEdit3 className="service-icon" size={20} />
                  <div className="service-input-wrapper">
                    <input
                      type="text"
                      className="service-input"
                      placeholder="Tên dịch vụ"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <div className="color-picker-trigger" onClick={() => setShowColorPicker(!showColorPicker)}>
                      <div
                        className="color-indicator"
                        style={{ background: form.color }}

                      ></div>
                      <FiChevronDown color="#afafaf" />

                      {showColorPicker && (
                        <div className="color-picker-popover" ref={colorPickerRef}>
                          {COLORS.map(c => (
                            <div className="color-option-wrap">
                              <div
                                key={c}
                                className={`color-option ${form.color === c ? 'active' : ''}`}
                                style={{ background: c }}
                                onClick={() => {
                                  setForm({ ...form, color: c });
                                  setShowColorPicker(false);
                                }}
                              ></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mô tả */}
                <div className="service-form-group">
                  <FiFileText className="service-icon" size={20} />
                  <div className="service-input-wrapper">
                    <input
                      type="text"
                      className="service-input"
                      placeholder="Thêm mô tả"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Thời lượng */}
                <div className="service-form-group">
                  <FiClock className="service-icon" size={20} />
                  <div className="service-input-wrapper">
                    <input
                      type="number"
                      className="service-input"
                      placeholder="Thời lượng (phút)"
                      value={form.duration_minutes || ''}
                      onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Giá */}
                <div className="service-form-group">
                  <FiDollarSign className="service-icon" size={20} />
                  <div className="service-input-wrapper">
                    <input
                      type="number"
                      className="service-input"
                      placeholder="Giá (đ)"
                      value={form.price || ''}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Nhóm */}
                <div className="service-form-group" ref={categoryRef}>
                  <FiFolder className="service-icon" size={20} />
                  <div className="service-input-wrapper service-input-clickable" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}>
                    <div className={`service-input ${form.category ? 'service-text-value' : 'service-text-placeholder'}`}>
                      {form.category || 'Nhóm Dịch Vụ'}
                    </div>
                    <FiChevronDown className="service-select-arrow" />

                    {showCategoryDropdown && (
                      <div className="category-dropdown">
                        {CATEGORIES.map(cat => (
                          <div
                            key={cat}
                            className={`category-item ${form.category === cat ? 'active' : ''}`}
                            onClick={() => {
                              setForm({ ...form, category: cat });
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {cat}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle Hoạt động */}
                <div className="toggle-container">
                  <div
                    className={`toggle-switch ${!form.is_active ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  >
                    <div className="toggle-knob"></div>
                  </div>
                  <span className="toggle-label">Bật để ẩn khỏi booking</span>
                </div>
              </div>

              <div className="service-modal-footer">
                <button
                  type="submit"
                  className={`btn-save ${isFormValid ? 'active' : ''}`}
                  disabled={!isFormValid}
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;
