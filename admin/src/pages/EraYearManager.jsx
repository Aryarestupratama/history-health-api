import { useState, useEffect } from 'react';
import api from '../api';

// Ubah "Masa Kolonial" -> "masa-kolonial"
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function EraYearManager() {
  const [eras, setEras] = useState([]);
  const [selectedEra, setSelectedEra] = useState(null);
  const [years, setYears] = useState([]);
  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [error, setError] = useState(null);

  // Form state - Era
  const [eraForm, setEraForm] = useState({ name: '', slug: '', description: '', order: '' });
  const [editingEraId, setEditingEraId] = useState(null);
  const [showEraForm, setShowEraForm] = useState(false);

  // Form state - Year
  const [yearForm, setYearForm] = useState({ year: '', title: '' });
  const [editingYearId, setEditingYearId] = useState(null);
  const [showYearForm, setShowYearForm] = useState(false);

  useEffect(() => {
    fetchEras();
  }, []);

  useEffect(() => {
    if (selectedEra) {
      fetchYears(selectedEra.id);
    } else {
      setYears([]);
    }
  }, [selectedEra]);

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

  // ---------- ERA CRUD ----------
  function handleEraNameChange(name) {
    setEraForm((prev) => ({
      ...prev,
      name,
      // hanya auto-generate slug kalau bukan mode edit (biar slug lama ga ketiban
      // saat admin cuma mau ubah nama tanpa mau slug berubah, kecuali dia mau)
      slug: generateSlug(name),
    }));
  }

  function openAddEraForm() {
    resetEraForm();
    // auto-fill urutan = urutan terakhir + 1
    const maxOrder = eras.length > 0 ? Math.max(...eras.map((e) => e.order)) : 0;
    setEraForm((prev) => ({ ...prev, order: maxOrder + 1 }));
    setShowEraForm(true);
  }

  async function handleEraSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...eraForm, order: Number(eraForm.order) };
      if (editingEraId) {
        await api.put(`/admin/eras/${editingEraId}`, payload);
      } else {
        await api.post('/admin/eras', payload);
      }
      resetEraForm();
      fetchEras();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan era.');
    }
  }

  function startEditEra(era) {
    setEditingEraId(era.id);
    setEraForm({
      name: era.name,
      slug: era.slug,
      description: era.description || '',
      order: era.order,
    });
    setShowEraForm(true);
  }

  function resetEraForm() {
    setEditingEraId(null);
    setEraForm({ name: '', slug: '', description: '', order: '' });
    setShowEraForm(false);
  }

  async function handleDeleteEra(era) {
    if (!confirm(`Hapus era "${era.name}"? Ini akan menghapus semua tahun & section di dalamnya.`)) return;
    try {
      await api.delete(`/admin/eras/${era.id}`);
      if (selectedEra?.id === era.id) setSelectedEra(null);
      fetchEras();
    } catch (err) {
      setError('Gagal menghapus era.');
    }
  }

  // ---------- YEAR CRUD ----------
  function openAddYearForm() {
    resetYearForm();
    setShowYearForm(true);
  }

  async function handleYearSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        era_id: selectedEra.id,
        year: Number(yearForm.year),
        title: yearForm.title,
      };
      if (editingYearId) {
        await api.put(`/admin/years/${editingYearId}`, payload);
      } else {
        await api.post('/admin/years', payload);
      }
      resetYearForm();
      fetchYears(selectedEra.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tahun.');
    }
  }

  function startEditYear(year) {
    setEditingYearId(year.id);
    setYearForm({ year: year.year, title: year.title });
    setShowYearForm(true);
  }

  function resetYearForm() {
    setEditingYearId(null);
    setYearForm({ year: '', title: '' });
    setShowYearForm(false);
  }

  async function handleDeleteYear(year) {
    if (!confirm(`Hapus tahun "${year.year} - ${year.title}"? Ini akan menghapus semua section di dalamnya.`)) return;
    try {
      await api.delete(`/admin/years/${year.id}`);
      fetchYears(selectedEra.id);
    } catch (err) {
      setError('Gagal menghapus tahun.');
    }
  }

  // Daftar tahun yang sudah terisi, diurutkan, buat ditampilkan sebagai info ringkas
  const sortedYearNumbers = [...years].map((y) => y.year).sort((a, b) => a - b);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Kelola Era & Tahun</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 32 }}>
        {/* ---------- KOLOM ERA ---------- */}
        <div style={{ flex: 1 }}>
          <h3>Era</h3>

          {!showEraForm && (
            <button onClick={openAddEraForm} style={{ marginBottom: 12 }}>
              + Tambah Era
            </button>
          )}

          {showEraForm && (
            <form onSubmit={handleEraSubmit} style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12 }}>
              <div>
                <label>Nama: </label>
                <input
                  value={eraForm.name}
                  onChange={(e) => handleEraNameChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Slug (otomatis): </label>
                <input value={eraForm.slug} disabled style={{ background: '#f0f0f0', color: '#666' }} />
              </div>
              <div>
                <label>Deskripsi: </label>
                <textarea
                  value={eraForm.description}
                  onChange={(e) => setEraForm({ ...eraForm, description: e.target.value })}
                />
              </div>
              <div>
                <label>Urutan (otomatis, bisa diubah): </label>
                <input
                  type="number"
                  value={eraForm.order}
                  onChange={(e) => setEraForm({ ...eraForm, order: e.target.value })}
                  required
                />
              </div>
              <button type="submit">{editingEraId ? 'Update Era' : 'Tambah Era'}</button>
              <button type="button" onClick={resetEraForm} style={{ marginLeft: 8 }}>
                Batal
              </button>
            </form>
          )}

          {loadingEras ? (
            <p>Memuat...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {eras.map((era) => (
                <li
                  key={era.id}
                  style={{
                    padding: 8,
                    border: '1px solid #ddd',
                    marginBottom: 6,
                    background: selectedEra?.id === era.id ? '#eef' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <div onClick={() => setSelectedEra(era)}>
                    <strong>{era.order}. {era.name}</strong> ({era.slug})
                  </div>
                  <button onClick={() => startEditEra(era)}>Edit</button>
                  <button onClick={() => handleDeleteEra(era)} style={{ marginLeft: 6 }}>
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- KOLOM YEAR ---------- */}
        <div style={{ flex: 1 }}>
          <h3>Tahun {selectedEra ? `— ${selectedEra.name}` : ''}</h3>

          {!selectedEra ? (
            <p style={{ color: '#888' }}>Pilih era di kiri dulu untuk melihat/menambah tahun.</p>
          ) : (
            <>
              {/* Info tahun yang sudah diinput */}
              <div style={{ background: '#f7f7f7', padding: 10, marginBottom: 12, fontSize: 14 }}>
                <strong>Tahun yang sudah diinput di era ini:</strong>{' '}
                {sortedYearNumbers.length === 0 ? (
                  <span style={{ color: '#888' }}>belum ada</span>
                ) : (
                  <span>{sortedYearNumbers.join(', ')}</span>
                )}
              </div>

              {!showYearForm && (
                <button onClick={openAddYearForm} style={{ marginBottom: 12 }}>
                  + Tambah Tahun
                </button>
              )}

              {showYearForm && (
                <form onSubmit={handleYearSubmit} style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12 }}>
                  <div>
                    <label>Tahun: </label>
                    <input
                      type="number"
                      value={yearForm.year}
                      onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                      required
                    />
                    {yearForm.year && sortedYearNumbers.includes(Number(yearForm.year)) && editingYearId === null && (
                      <span style={{ color: 'orange', marginLeft: 8 }}>
                        ⚠ Tahun ini sudah pernah diinput sebelumnya
                      </span>
                    )}
                  </div>
                  <div>
                    <label>Judul: </label>
                    <input
                      value={yearForm.title}
                      onChange={(e) => setYearForm({ ...yearForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit">{editingYearId ? 'Update Tahun' : 'Tambah Tahun'}</button>
                  <button type="button" onClick={resetYearForm} style={{ marginLeft: 8 }}>
                    Batal
                  </button>
                </form>
              )}

              {loadingYears ? (
                <p>Memuat...</p>
              ) : years.length === 0 ? (
                <p style={{ color: '#888' }}>Belum ada tahun di era ini.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {[...years]
                    .sort((a, b) => a.year - b.year)
                    .map((year) => (
                      <li key={year.id} style={{ padding: 8, border: '1px solid #ddd', marginBottom: 6 }}>
                        <strong>{year.year}</strong> — {year.title}
                        <button onClick={() => startEditYear(year)} style={{ marginLeft: 8 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteYear(year)} style={{ marginLeft: 6 }}>
                          Hapus
                        </button>
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