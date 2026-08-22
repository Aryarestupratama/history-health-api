import { useState, useEffect } from 'react';
import api from '../api';

const EMPTY_FORM = {
  name: '',
  photo: '',
  birth_date: '',
  death_date: '',
  family: '',
  role_description: '',
};

export default function FigureManager() {
  const [figures, setFigures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchFigures();
  }, []);

  async function fetchFigures() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/figures');
      setFigures(res.data);
    } catch (err) {
      setError('Gagal memuat daftar tokoh.');
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name,
        photo: form.photo || null,
        birth_date: form.birth_date || null,
        death_date: form.death_date || null,
        family: form.family || null,
        role_description: form.role_description,
      };
      if (editingId) {
        await api.put(`/admin/figures/${editingId}`, payload);
      } else {
        await api.post('/admin/figures', payload);
      }
      resetForm();
      fetchFigures();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tokoh.');
    }
  }

  function startEdit(figure) {
    setEditingId(figure.id);
    setForm({
      name: figure.name || '',
      photo: figure.photo || '',
      birth_date: figure.birth_date || '',
      death_date: figure.death_date || '',
      family: figure.family || '',
      role_description: figure.role_description || '',
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function handleDelete(figure) {
    if (!confirm(`Hapus tokoh "${figure.name}"? Ini juga akan melepas relasinya dari semua section.`)) return;
    try {
      await api.delete(`/admin/figures/${figure.id}`);
      fetchFigures();
    } catch (err) {
      setError('Gagal menghapus tokoh.');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Kelola Tokoh</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!showForm && (
        <button onClick={openAddForm} style={{ marginBottom: 12 }}>
          + Tambah Tokoh
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12, maxWidth: 480 }}>
          <div>
            <label>Nama: </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: 300 }}
              required
            />
          </div>
          <div>
            <label>Foto (link Google Drive): </label>
            <input
              value={form.photo}
              onChange={(e) => setForm({ ...form, photo: e.target.value })}
              placeholder="https://drive.google.com/file/d/FILE_ID/view..."
              style={{ width: 300 }}
            />
          </div>
          <div>
            <label>Tanggal Lahir: </label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>
          <div>
            <label>Tanggal Wafat: </label>
            <input
              type="date"
              value={form.death_date}
              onChange={(e) => setForm({ ...form, death_date: e.target.value })}
            />
          </div>
          <div>
            <label>Keluarga: </label>
            <textarea
              value={form.family}
              onChange={(e) => setForm({ ...form, family: e.target.value })}
              rows={3}
              style={{ width: 300 }}
            />
          </div>
          <div>
            <label>Peran dalam Dunia Kesehatan: </label>
            <textarea
              value={form.role_description}
              onChange={(e) => setForm({ ...form, role_description: e.target.value })}
              rows={4}
              style={{ width: 300 }}
              required
            />
          </div>
          <button type="submit">{editingId ? 'Update Tokoh' : 'Tambah Tokoh'}</button>
          <button type="button" onClick={resetForm} style={{ marginLeft: 8 }}>
            Batal
          </button>
        </form>
      )}

      {loading ? (
        <p>Memuat...</p>
      ) : figures.length === 0 ? (
        <p style={{ color: '#888' }}>Belum ada tokoh.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, maxWidth: 640 }}>
          {figures.map((figure) => (
            <li key={figure.id} style={{ padding: 8, border: '1px solid #ddd', marginBottom: 6 }}>
              <div>
                <strong>{figure.name}</strong>
                {(figure.birth_date || figure.death_date) && (
                  <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>
                    ({figure.birth_date || '?'} – {figure.death_date || '?'})
                  </span>
                )}
              </div>
              {figure.role_description && (
                <div
                  style={{
                    color: '#555',
                    fontSize: 13,
                    maxWidth: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {figure.role_description}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <button onClick={() => startEdit(figure)}>Edit</button>
                <button onClick={() => handleDelete(figure)} style={{ marginLeft: 6 }}>
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}