import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

const BLOCK_TYPES = [
  { value: 'text', label: 'Teks' },
  { value: 'image', label: 'Gambar (link Google Drive)' },
  { value: 'video', label: 'Video (link YouTube)' },
  { value: 'pdf', label: 'PDF (link Google Drive)' },
  { value: 'summary', label: 'Rangkuman' },
];

function contentPlaceholder(type) {
  switch (type) {
    case 'image':
    case 'pdf':
      return 'https://drive.google.com/file/d/FILE_ID/view...';
    case 'video':
      return 'https://youtube.com/watch?v=VIDEO_ID atau youtu.be/VIDEO_ID';
    default:
      return '';
  }
}

// Pastikan blok summary selalu di posisi terakhir sebelum dikirim ke backend (R-CMS-03).
// Backend juga memvalidasi/menormalisasi ini — ini cuma cegah round-trip yang salah kirim.
function withSummaryLast(blocks) {
  const summaries = blocks.filter((b) => b.type === 'summary');
  const rest = blocks.filter((b) => b.type !== 'summary');
  return [...rest, ...summaries];
}

export default function SectionEditor() {
  const { sectionId } = useParams();
  const navigate = useNavigate();

  const [section, setSection] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [figures, setFigures] = useState([]);
  const [assignedFigureIds, setAssignedFigureIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [form, setForm] = useState({ type: 'text', content: '' });
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const dragIndex = useRef(null);

  useEffect(() => {
    loadAll();
  }, [sectionId]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [sectionRes, blocksRes, figuresRes] = await Promise.all([
        api.get(`/admin/sections/${sectionId}`),
        api.get(`/admin/sections/${sectionId}/content-blocks`),
        api.get('/admin/figures'),
      ]);
      setSection(sectionRes.data);
      setBlocks([...blocksRes.data].sort((a, b) => a.order - b.order));
      setFigures(figuresRes.data);
      setAssignedFigureIds((sectionRes.data.figures || []).map((f) => f.id));
    } catch (err) {
      setError('Gagal memuat data section.');
    } finally {
      setLoading(false);
    }
  }

  async function refetchBlocks() {
    const res = await api.get(`/admin/sections/${sectionId}/content-blocks`);
    setBlocks([...res.data].sort((a, b) => a.order - b.order));
  }

  // ---------- BLOCK CRUD ----------
  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { type: form.type, content: form.content };
      if (editingBlockId) {
        await api.patch(`/admin/sections/${sectionId}/content-blocks/${editingBlockId}`, payload);
      } else {
        await api.post(`/admin/sections/${sectionId}/content-blocks`, payload);
      }
      resetForm();
      refetchBlocks();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan blok konten.');
    }
  }

  function startEdit(block) {
    setEditingBlockId(block.id);
    setForm({ type: block.type, content: block.content });
    setShowForm(true);
  }

  function resetForm() {
    setEditingBlockId(null);
    setForm({ type: 'text', content: '' });
    setShowForm(false);
  }

  async function handleDeleteBlock(block) {
    if (!confirm(`Hapus blok "${block.type}" ini?`)) return;
    try {
      await api.delete(`/admin/sections/${sectionId}/content-blocks/${block.id}`);
      refetchBlocks();
    } catch (err) {
      setError('Gagal menghapus blok konten.');
    }
  }

  // ---------- DRAG & DROP REORDER (R-CMS-02/03) ----------
  function handleDragStart(index) {
    dragIndex.current = index;
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(index) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;

    const reordered = [...blocks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);

    setBlocks(withSummaryLast(reordered));
  }

  async function saveOrder() {
    setSavingOrder(true);
    setError(null);
    try {
      const orderedIds = withSummaryLast(blocks).map((b) => b.id);
      const res = await api.post(`/admin/sections/${sectionId}/content-blocks/reorder`, {
        block_ids: orderedIds,
      });
      setBlocks(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan urutan blok.');
      refetchBlocks();
    } finally {
      setSavingOrder(false);
    }
  }

  // ---------- ASSIGN FIGURES (CMS-05) ----------
  function toggleFigure(figureId) {
    setAssignedFigureIds((prev) =>
      prev.includes(figureId) ? prev.filter((id) => id !== figureId) : [...prev, figureId]
    );
  }

  async function saveFigures() {
    setError(null);
    try {
      const res = await api.post(`/admin/sections/${sectionId}/assign-figures`, {
        figure_ids: assignedFigureIds,
      });
      setSection(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tokoh terkait.');
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Memuat...</div>;
  if (!section) return <div style={{ padding: 24 }}>Section tidak ditemukan.</div>;

  const hasSummary = blocks.some((b) => b.type === 'summary');

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/sections')} style={{ marginBottom: 12 }}>
        ← Kembali ke Kelola Section
      </button>

      <h2>{section.title}</h2>
      <p style={{ color: '#666' }}>
        {section.year?.era?.name} — {section.year?.year} ({section.year?.title}) &middot;{' '}
        <span style={{ color: section.is_published ? '#070' : '#555' }}>
          {section.is_published ? 'Published' : 'Draft'}
        </span>
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* ---------- BLOK KONTEN ---------- */}
        <div style={{ flex: 1.6 }}>
          <h3>Blok Konten</h3>
          <p style={{ fontSize: 13, color: '#888' }}>
            Drag baris untuk mengurutkan. Blok "Rangkuman" otomatis dipaksa ke posisi terakhir (R-CMS-03).
            {!hasSummary && ' Section wajib punya minimal 1 blok Rangkuman sebelum bisa di-publish (R-CMS-04).'}
          </p>

          {!showForm && (
            <button onClick={openAddForm} style={{ marginBottom: 12 }}>
              + Tambah Blok
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12 }}>
              <div>
                <label>Tipe: </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  disabled={!!editingBlockId}
                >
                  {BLOCK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Konten: </label>
                {form.type === 'text' || form.type === 'summary' ? (
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={5}
                    style={{ width: 360 }}
                    required
                  />
                ) : (
                  <input
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder={contentPlaceholder(form.type)}
                    style={{ width: 360 }}
                    required
                  />
                )}
              </div>
              <button type="submit">{editingBlockId ? 'Update Blok' : 'Tambah Blok'}</button>
              <button type="button" onClick={resetForm} style={{ marginLeft: 8 }}>
                Batal
              </button>
            </form>
          )}

          {blocks.length === 0 ? (
            <p style={{ color: '#888' }}>Belum ada blok konten.</p>
          ) : (
            <>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {blocks.map((block, index) => (
                  <li
                    key={block.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    style={{
                      padding: 8,
                      border: '1px solid #ddd',
                      marginBottom: 6,
                      background: block.type === 'summary' ? '#fff8e1' : 'white',
                      cursor: 'grab',
                    }}
                  >
                    <div>
                      <span style={{ cursor: 'grab', marginRight: 6 }}>⠿</span>
                      <strong>{BLOCK_TYPES.find((t) => t.value === block.type)?.label || block.type}</strong>
                      <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>urutan: {block.order}</span>
                    </div>
                    <div
                      style={{
                        margin: '4px 0',
                        color: '#555',
                        fontSize: 13,
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {block.content}
                    </div>
                    <button onClick={() => startEdit(block)}>Edit</button>
                    <button onClick={() => handleDeleteBlock(block)} style={{ marginLeft: 6 }}>
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={saveOrder} disabled={savingOrder}>
                {savingOrder ? 'Menyimpan urutan...' : 'Simpan Urutan'}
              </button>
            </>
          )}
        </div>

        {/* ---------- TOKOH TERKAIT ---------- */}
        <div style={{ flex: 1 }}>
          <h3>Tokoh Terkait (CMS-05)</h3>
          {figures.length === 0 ? (
            <p style={{ color: '#888' }}>
              Belum ada data tokoh. Tambahkan dulu di <Link to="/figures">Kelola Tokoh</Link>.
            </p>
          ) : (
            <>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {figures.map((figure) => (
                  <li key={figure.id} style={{ padding: '4px 0' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={assignedFigureIds.includes(figure.id)}
                        onChange={() => toggleFigure(figure.id)}
                      />{' '}
                      {figure.name}
                    </label>
                  </li>
                ))}
              </ul>
              <button onClick={saveFigures}>Simpan Tokoh Terkait</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}