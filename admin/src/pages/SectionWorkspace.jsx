import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, GripVertical, Plus, X, Pencil, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import { cn } from '@/lib/utils';
import { getEraAccent } from '@/config/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';

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

// Workspace gabungan: satu halaman per Tahun ("1 informasi"). Sidebar kiri
// mengelola daftar Section di tahun ini. Kolom tengah menampilkan blok
// konten HANYA milik section yang lagi dipilih di sidebar. Kolom kanan
// (Tokoh Terkait) juga mengikuti section yang dipilih -- bukan digabung
// se-tahun ataupun dipecah per-blok, karena relasi tokoh memang di level
// section (section_figure pivot, lihat Schema.md).
export default function SectionWorkspace() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [year, setYear] = useState(null);
  const [era, setEra] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const [blocks, setBlocks] = useState([]);
  const [figures, setFigures] = useState([]);
  const [assignedFigureIds, setAssignedFigureIds] = useState([]);

  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingSectionDetail, setLoadingSectionDetail] = useState(false);
  const [error, setError] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [sectionForm, setSectionForm] = useState({ title: '', quiz_link: '' });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [showSectionForm, setShowSectionForm] = useState(false);

  const [blockForm, setBlockForm] = useState({ type: 'text', content: '' });
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [showBlockForm, setShowBlockForm] = useState(false);

  const dragIndex = useRef(null);

  useEffect(() => {
    loadYearContext();
    loadSections();
    loadFigures();
    // reset seleksi & form saat pindah tahun
    setSelectedSectionId(null);
    resetSectionForm();
    resetBlockForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

  useEffect(() => {
    if (selectedSectionId) {
      loadSectionDetail(selectedSectionId);
    } else {
      setBlocks([]);
      setAssignedFigureIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  async function loadYearContext() {
    setLoadingContext(true);
    try {
      const yearRes = await api.get(`/admin/years/${yearId}`);
      setYear(yearRes.data);
      const eraRes = await api.get(`/admin/eras/${yearRes.data.era_id}`);
      setEra(eraRes.data);
    } catch (err) {
      setError('Gagal memuat data tahun.');
    } finally {
      setLoadingContext(false);
    }
  }

  async function loadSections() {
    setLoadingSections(true);
    setError(null);
    try {
      const res = await api.get('/admin/sections', { params: { year_id: yearId } });
      setSections(res.data);
      setSelectedSectionId((prev) => {
        if (prev && res.data.some((s) => s.id === prev)) return prev;
        return res.data.length > 0 ? res.data[0].id : null;
      });
    } catch (err) {
      setError('Gagal memuat daftar section.');
    } finally {
      setLoadingSections(false);
    }
  }

  async function loadFigures() {
    try {
      const res = await api.get('/admin/figures');
      setFigures(res.data);
    } catch (err) {
      setError('Gagal memuat daftar tokoh.');
    }
  }

  async function loadSectionDetail(sectionId) {
    setLoadingSectionDetail(true);
    try {
      const [sectionRes, blocksRes] = await Promise.all([
        api.get(`/admin/sections/${sectionId}`),
        api.get(`/admin/sections/${sectionId}/content-blocks`),
      ]);
      setBlocks([...blocksRes.data].sort((a, b) => a.order - b.order));
      setAssignedFigureIds((sectionRes.data.figures || []).map((f) => f.id));
    } catch (err) {
      setError('Gagal memuat detail section.');
    } finally {
      setLoadingSectionDetail(false);
    }
  }

  async function refetchBlocks() {
    if (!selectedSectionId) return;
    const res = await api.get(`/admin/sections/${selectedSectionId}/content-blocks`);
    setBlocks([...res.data].sort((a, b) => a.order - b.order));
  }

  // ---------- SECTION CRUD (sidebar) ----------
  function openAddSectionForm() {
    resetSectionForm();
    setShowSectionForm(true);
  }

  async function handleSectionSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { year_id: Number(yearId), title: sectionForm.title, quiz_link: sectionForm.quiz_link || null };
      if (editingSectionId) {
        await api.put(`/admin/sections/${editingSectionId}`, payload);
      } else {
        const res = await api.post('/admin/sections', payload);
        setSelectedSectionId(res.data.id);
      }
      resetSectionForm();
      loadSections();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan section.');
    }
  }

  function startEditSection(section) {
    setEditingSectionId(section.id);
    setSectionForm({ title: section.title, quiz_link: section.quiz_link || '' });
    setShowSectionForm(true);
  }

  function resetSectionForm() {
    setEditingSectionId(null);
    setSectionForm({ title: '', quiz_link: '' });
    setShowSectionForm(false);
  }

  async function handleDeleteSection(section) {
    const ok = await confirm({
      title: `Hapus section "${section.title}"?`,
      description: 'Ini akan menghapus semua blok konten di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/sections/${section.id}`);
      if (selectedSectionId === section.id) setSelectedSectionId(null);
      loadSections();
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
      loadSections();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengubah status publish.');
    }
  }

  // ---------- BLOCK CRUD (tengah, khusus section yang dipilih di sidebar) ----------
  function openAddBlockForm() {
    resetBlockForm();
    setShowBlockForm(true);
  }

  async function handleBlockSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { type: blockForm.type, content: blockForm.content };
      if (editingBlockId) {
        await api.patch(`/admin/sections/${selectedSectionId}/content-blocks/${editingBlockId}`, payload);
      } else {
        await api.post(`/admin/sections/${selectedSectionId}/content-blocks`, payload);
      }
      resetBlockForm();
      refetchBlocks();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan blok konten.');
    }
  }

  function startEditBlock(block) {
    setEditingBlockId(block.id);
    setBlockForm({ type: block.type, content: block.content });
    setShowBlockForm(true);
  }

  function resetBlockForm() {
    setEditingBlockId(null);
    setBlockForm({ type: 'text', content: '' });
    setShowBlockForm(false);
  }

  async function handleDeleteBlock(block) {
    const ok = await confirm({ title: `Hapus blok "${block.type}" ini?` });
    if (!ok) return;
    try {
      await api.delete(`/admin/sections/${selectedSectionId}/content-blocks/${block.id}`);
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
      const res = await api.post(`/admin/sections/${selectedSectionId}/content-blocks/reorder`, {
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

  // ---------- TOKOH TERKAIT (kanan, ikut section yang dipilih di sidebar) ----------
  function toggleFigure(figureId) {
    setAssignedFigureIds((prev) =>
      prev.includes(figureId) ? prev.filter((id) => id !== figureId) : [...prev, figureId]
    );
  }

  async function saveFigures() {
    if (!selectedSectionId) return;
    setError(null);
    try {
      const res = await api.post(`/admin/sections/${selectedSectionId}/assign-figures`, {
        figure_ids: assignedFigureIds,
      });
      setAssignedFigureIds((res.data.figures || []).map((f) => f.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tokoh terkait.');
    }
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;
  const hasSummary = blocks.some((b) => b.type === 'summary');
  const accent = era ? getEraAccent(era.slug) : null;

  return (
    <div className="space-y-6">
      {dialog}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/sections')}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Section
        </Button>
        {loadingContext ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              {year ? `${year.year} — ${year.title}` : `Tahun #${yearId}`}
            </h1>
            {era && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent.hex }} />
                {era.name}
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.5fr_1fr]">
        {/* ---------- SIDEBAR: SECTION ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Section</CardTitle>
            {!showSectionForm && (
              <Button size="sm" onClick={openAddSectionForm}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {showSectionForm && (
              <form onSubmit={handleSectionSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{editingSectionId ? 'Edit Section' : 'Section Baru'}</p>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetSectionForm}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label>Judul</Label>
                  <Input
                    value={sectionForm.title}
                    onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Link Kuis (opsional)</Label>
                  <Input
                    value={sectionForm.quiz_link}
                    onChange={(e) => setSectionForm({ ...sectionForm, quiz_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                {!editingSectionId && (
                  <p className="text-xs text-muted-foreground">
                    Section baru selalu draft (R-ADMIN-03). Publish setelah minimal 1 blok Rangkuman terisi (R-CMS-04).
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm">{editingSectionId ? 'Update' : 'Tambah'}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetSectionForm}>Batal</Button>
                </div>
              </form>
            )}

            {loadingSections ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada section di tahun ini.</p>
            ) : (
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li
                    key={section.id}
                    className={cn(
                      'rounded-lg border p-2.5 transition-colors',
                      selectedSectionId === section.id ? 'border-primary/40 bg-secondary' : 'hover:bg-secondary/50'
                    )}
                  >
                    <button onClick={() => setSelectedSectionId(section.id)} className="w-full text-left">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{section.title}</p>
                        <Badge variant={section.is_published ? 'success' : 'secondary'} className="shrink-0">
                          {section.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </button>
                    <div className="mt-2 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditSection(section)} title="Edit Info">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePublish(section)} title={section.is_published ? 'Unpublish' : 'Publish'}>
                        {section.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSection(section)} title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------- TENGAH: BLOK KONTEN — hanya milik section yang dipilih ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Blok Konten{selectedSection ? ` — ${selectedSection.title}` : ''}</CardTitle>
              <CardDescription className="mt-1">
                {!selectedSectionId
                  ? 'Pilih section di kiri untuk mengelola blok kontennya.'
                  : 'Drag baris untuk mengurutkan. Blok "Rangkuman" otomatis dipaksa ke posisi terakhir (R-CMS-03).'}
                {selectedSectionId && !hasSummary && ' Section wajib punya minimal 1 blok Rangkuman sebelum bisa di-publish (R-CMS-04).'}
              </CardDescription>
            </div>
            {selectedSectionId && !showBlockForm && (
              <Button size="sm" onClick={openAddBlockForm}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedSectionId ? (
              <p className="text-sm text-muted-foreground">Belum ada section terpilih.</p>
            ) : loadingSectionDetail ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              <>
                {showBlockForm && (
                  <form onSubmit={handleBlockSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{editingBlockId ? 'Edit Blok' : 'Blok Baru'}</p>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetBlockForm}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tipe</Label>
                      <Select
                        value={blockForm.type}
                        onValueChange={(value) => setBlockForm({ ...blockForm, type: value })}
                        disabled={!!editingBlockId}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOCK_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Konten</Label>
                      {blockForm.type === 'text' || blockForm.type === 'summary' ? (
                        <Textarea
                          value={blockForm.content}
                          onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value })}
                          rows={5}
                          required
                        />
                      ) : (
                        <Input
                          value={blockForm.content}
                          onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value })}
                          placeholder={contentPlaceholder(blockForm.type)}
                          required
                        />
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm">{editingBlockId ? 'Update Blok' : 'Tambah Blok'}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={resetBlockForm}>Batal</Button>
                    </div>
                  </form>
                )}

                {blocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada blok konten.</p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {blocks.map((block, index) => (
                        <li
                          key={block.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(index)}
                          className={cn(
                            'flex items-start gap-2 rounded-lg border p-3 cursor-grab active:cursor-grabbing',
                            block.type === 'summary' ? 'border-warning/30 bg-warning/5' : 'bg-background'
                          )}
                        >
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {BLOCK_TYPES.find((t) => t.value === block.type)?.label || block.type}
                              </span>
                              <span className="text-xs text-muted-foreground">urutan: {block.order}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{block.content}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditBlock(block)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteBlock(block)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Button onClick={saveOrder} disabled={savingOrder} size="sm">
                      {savingOrder ? 'Menyimpan urutan...' : 'Simpan Urutan'}
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ---------- KANAN: TOKOH TERKAIT — ikut section yang dipilih, bukan per-tahun/per-block ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gamify/10 text-gamify">
                <Users className="h-3.5 w-3.5" />
              </span>
              Tokoh Terkait
            </CardTitle>
            <CardDescription>
              {!selectedSectionId
                ? 'Pilih section di kiri dulu.'
                : `CMS-05 — tokoh untuk section "${selectedSection?.title}". Otomatis ter-unlock di app saat section ini selesai dibaca.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSectionId ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : figures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data tokoh. Tambahkan dulu di{' '}
                <Link to="/figures" className="font-medium text-foreground underline underline-offset-2">
                  Kelola Tokoh
                </Link>.
              </p>
            ) : (
              <>
                <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                  {figures.map((figure) => (
                    <li key={figure.id}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-secondary/50">
                        <input
                          type="checkbox"
                          checked={assignedFigureIds.includes(figure.id)}
                          onChange={() => toggleFigure(figure.id)}
                          className="h-4 w-4 rounded border-input accent-foreground"
                        />
                        {figure.name}
                      </label>
                    </li>
                  ))}
                </ul>
                <Button onClick={saveFigures} size="sm" className="mt-3">Simpan Tokoh Terkait</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}