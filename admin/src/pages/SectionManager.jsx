import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function SectionManager() {
  const navigate = useNavigate();

  const [eras, setEras] = useState([]);
  const [selectedEra, setSelectedEra] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [sections, setSections] = useState([]);

  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ title: '', quiz_link: '' });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEras();
  }, []);

  useEffect(() => {
    if (selectedEra) {
      fetchYears(selectedEra.id);
      setSelectedYear(null);
      setSections([]);
    } else {
      setYears([]);
    }
  }, [selectedEra]);

  useEffect(() => {
    if (selectedYear) {
      fetchSections(selectedYear.id);
    } else {
      setSections([]);
    }
  }, [selectedYear]);

  async function fetchEras() {
    setLoadingEras(true);
    setError(null);
    try {
      const res = await api.get('/admin/eras');
      setEras(res.data);
    } catch (err) {
      setError('Gagal memuat daftar era.');
    } finally {
      setLoadingEras(false);
    }
  }

  async function fetchYears(eraId) {
    setLoadingYears(true);
    try {
      const res = await api.get('/admin/years', { params: { era_id: eraId } });
      setYears(res.data);
    } catch (err) {
      setError('Gagal memuat daftar tahun.');
    } finally {
      setLoadingYears(false);
    }
  }

  async function fetchSections(yearId) {
    setLoadingSections(true);
    setError(null);
    try {
      const res = await api.get('/admin/sections', { params: { year_id: yearId } });
      setSections(res.data);
    } catch (err) {
      setError('Gagal memuat daftar section.');
    } finally {
      setLoadingSections(false);
    }
  }

  // ---------- SECTION CRUD ----------
  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        year_id: selectedYear.id,
        title: form.title,
        quiz_link: form.quiz_link || null,
      };
      if (editingId) {
        await api.put(`/admin/sections/${editingId}`, payload);
      } else {
        await api.post('/admin/sections', payload);
      }
      resetForm();
      fetchSections(selectedYear.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan section.');
    }
  }

  function startEdit(section) {
    setEditingId(section.id);
    setForm({ title: section.title, quiz_link: section.quiz_link || '' });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ title: '', quiz_link: '' });
    setShowForm(false);
  }

  async function handleDelete(section) {
    if (!confirm(`Hapus section "${section.title}"? Ini akan menghapus semua blok konten di dalamnya.`)) return;
    try {
      await api.delete(`/admin/sections/${section.id}`);
      fetchSections(selectedYear.id);
    } catch (err) {
      setError('Gagal menghapus section.');
    }
  }

  // R-CMS-04: publish ditolak backend kalau belum ada blok summary — pesan error ditangkap dari response
  async function togglePublish(section) {
    setError(null);
    try {
      await api.put(`/admin/sections/${section.id}`, {
        title: section.title,
        quiz_link: section.quiz_link,
        is_published: !section.is_published,
      });
      fetchSections(selectedYear.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengubah status publish.');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Kelola Section</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 32 }}>
        {/* ---------- KOLOM ERA ---------- */}
        <div style={{ flex: 1 }}>
          <h3>Era</h3>
          {loadingEras ? (
            <p>Memuat...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {eras.map((era) => (
                <li
                  key={era.id}
                  onClick={() => setSelectedEra(era)}
                  style={{
                    padding: 8,
                    border: '1px solid #ddd',
                    marginBottom: 6,
                    background: selectedEra?.id === era.id ? '#eef' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  {era.order}. {era.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- KOLOM TAHUN ---------- */}
        <div style={{ flex: 1 }}>
          <h3>Tahun {selectedEra ? `— ${selectedEra.name}` : ''}</h3>
          {!selectedEra ? (
            <p style={{ color: '#888' }}>Pilih era di kiri dulu.</p>
          ) : loadingYears ? (
            <p>Memuat...</p>
          ) : years.length === 0 ? (
            <p style={{ color: '#888' }}>Belum ada tahun di era ini.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[...years]
                .sort((a, b) => a.year - b.year)
                .map((year) => (
                  <li
                    key={year.id}
                    onClick={() => setSelectedYear(year)}
                    style={{
                      padding: 8,
                      border: '1px solid #ddd',
                      marginBottom: 6,
                      background: selectedYear?.id === year.id ? '#eef' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <strong>{year.year}</strong> — {year.title}
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* ---------- KOLOM SECTION ---------- */}
        <div style={{ flex: 1.4 }}>
          <h3>Section {selectedYear ? `— ${selectedYear.year}` : ''}</h3>

          {!selectedYear ? (
            <p style={{ color: '#888' }}>Pilih tahun di tengah dulu untuk melihat/menambah section.</p>
          ) : (
            <>
              {!showForm && (
                <button onClick={openAddForm} style={{ marginBottom: 12 }}>
                  + Tambah Section
                </button>
              )}

              {showForm && (
                <form onSubmit={handleSubmit} style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12 }}>
                  <div>
                    <label>Judul: </label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Link Kuis (Upresenter, opsional): </label>
                    <input
                      value={form.quiz_link}
                      onChange={(e) => setForm({ ...form, quiz_link: e.target.value })}
                      placeholder="https://..."
                      style={{ width: 260 }}
                    />
                  </div>
                  {!editingId && (
                    <p style={{ color: '#888', fontSize: 13 }}>
                      Section baru selalu dibuat sebagai draft (R-ADMIN-03). Publish dilakukan setelah blok konten
                      diisi, minimal 1 blok rangkuman (R-CMS-04).
                    </p>
                  )}
                  <button type="submit">{editingId ? 'Update Section' : 'Tambah Section'}</button>
                  <button type="button" onClick={resetForm} style={{ marginLeft: 8 }}>
                    Batal
                  </button>
                </form>
              )}

              {loadingSections ? (
                <p>Memuat...</p>
              ) : sections.length === 0 ? (
                <p style={{ color: '#888' }}>Belum ada section di tahun ini.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {sections.map((section) => (
                    <li key={section.id} style={{ padding: 8, border: '1px solid #ddd', marginBottom: 6 }}>
                      <div>
                        <strong>{section.title}</strong>{' '}
                        <span
                          style={{
                            fontSize: 12,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: section.is_published ? '#dfd' : '#eee',
                            color: section.is_published ? '#070' : '#555',
                          }}
                        >
                          {section.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <button onClick={() => navigate(`/sections/${section.id}`)}>
                          Kelola Blok Konten & Tokoh
                        </button>
                        <button onClick={() => startEdit(section)} style={{ marginLeft: 6 }}>
                          Edit Info
                        </button>
                        <button onClick={() => togglePublish(section)} style={{ marginLeft: 6 }}>
                          {section.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => handleDelete(section)} style={{ marginLeft: 6 }}>
                          Hapus
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}