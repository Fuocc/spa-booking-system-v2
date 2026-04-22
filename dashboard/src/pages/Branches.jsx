import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin } from 'react-icons/fi';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../api';

function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', phone: '' });
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({ name: branch.name, address: branch.address || '', phone: branch.phone || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateBranch(editing.id, form);
      } else {
        await createBranch(form);
      }
      setModalOpen(false);
      loadBranches();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa chi nhánh này? Điều này có thể ảnh hưởng đến nhân viên và giường thuộc chi nhánh.')) return;
    try {
      await deleteBranch(id);
      loadBranches();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chi nhánh</h1>
          <p className="page-subtitle">Quản lý các chi nhánh spa</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Thêm chi nhánh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {branches.map(branch => (
          <div key={branch.id} className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: '#f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FiMapPin size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{branch.name}</div>
                    <div style={{ fontSize: 13, color: '#4b4b4b', marginTop: 4 }}>{branch.address || 'Chưa có địa chỉ'}</div>
                    <div style={{ fontSize: 13, color: '#afafaf', marginTop: 2 }}>{branch.phone || ''}</div>
                  </div>
                </div>
                <div className="actions-cell">
                  <button className="btn-icon" onClick={() => openEdit(branch)}><FiEdit2 size={14} /></button>
                  <button className="btn-icon danger" onClick={() => handleDelete(branch.id)}><FiTrash2 size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <h4>Chưa có chi nhánh</h4>
            <p>Thêm chi nhánh đầu tiên để bắt đầu</p>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</h3>
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
                  <label className="form-label">Tên chi nhánh</label>
                  <input type="text" className="form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ</label>
                  <input type="text" className="form-input" value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input type="tel" className="form-input" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
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

export default Branches;
