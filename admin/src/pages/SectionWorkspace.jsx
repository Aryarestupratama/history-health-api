import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, GripVertical, Plus, X, Pencil, Trash2, Syringe, Eye, EyeOff, HelpCircle } from 'lucide-react';
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

// Tipe summary dihapus dari content_blocks (rangkuman sekarang di
// years.summary, Rules.md R-YEAR-01 / Architecture.md §4.2).
const BLOCK_TYPES = [
  { value: 'text', label: 'Teks' },
  { value: 'image', label: 'Gambar (link Google Drive)' },
  { value: 'video', label: 'Video (link YouTube)' },
  { value: 'pdf', label: 'PDF (link Google Drive)' },
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

// Workspace gabungan: satu halaman per Tahun ("1 wabah"). Sidebar kiri
// mengelola daftar Section di tahun ini (urutan = sequential unlock,
// Architecture.md §4.7). Kolom tengah menampilkan blok konten HANYA milik
// section yang lagi dipilih di sidebar. Kolom kanan sekarang berisi
// Rangkuman Wabah (years.summary) + Vaksin Terkait (year_vaccine) + akses ke
// Kelola Kuis — semuanya di level TAHUN, bukan lagi per-section, karena
// relasi vaksin/kuis/rangkuman sudah naik level (Architecture.md §4.8).
export default function SectionWorkspace() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [year, setYear] = useState(null);
  const [era, setEra] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const [blocks, setBlocks] = useState([]);

  // ---- level TAHUN: rangkuman & vaksin (bukan lagi level section) ----
  const [summaryDraft, setSummaryDraft] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [vaccines, setVaccines] = useState([]);
  const [assignedVaccineIds, setAssignedVaccineIds] = useState([]);
  const [savingVaccines, setSavingVaccines] = useState(false);

  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingSectionDetail, setLoadingSectionDetail] = useState(false);
  const [error, setError] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [sectionForm, setSectionForm] = useState({ title: '' });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [showSectionForm, setShowSectionForm] = useState(false);

  const [blockForm, setBlockForm] = useState({ type: 'text', content: '' });
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [showBlockForm, setShowBlockForm] = useState(false);

  const dragIndex = useRef(null);

  useEffect(() => {
    loadYearContext();
    loadSections();
    loadVaccines();
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  async function loadYearContext() {
    setLoadingContext(true);
    try {
      const yearRes = await api.get(`/admin/years/${yearId}`);
      setYear(yearRes.data);
      setSummaryDraft(yearRes.data.summary || '');
      // YearController::show() sudah eager-load relasi `vaccines` (progress.md)
      setAssignedVaccineIds((yearRes.data.vaccines || []).map((v) => v.id));
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

  async function loadVaccines() {
    try {
      const res = await api.get('/admin/vaccines');
      setVaccines(res.data);
    } catch (err) {
      setError('Gagal memuat daftar vaksin.');
    }
  }

  async function loadSectionDetail(sectionId) {
    setLoadingSectionDetail(true);
    try {
      const blocksRes = await api.get(`/admin/sections/${sectionId}/content-blocks`);
      setBlocks([...blocksRes.data].sort((a, b) => a.order - b.order));
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
      const payload = { year_id: Number(yearId), title: sectionForm.title };
      if (editingSectionId) {
        await api.put(`/admin/sections/${editingSectionId}`, payload);
      } else {
        // `order` tidak dikirim -> backend auto-assign urutan berikutnya
        // dalam year ini (SectionController::store(), progress.md)
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
    setSectionForm({ title: section.title });
    setShowSectionForm(true);
  }

  function resetSectionForm() {
    setEditingSectionId(null);
    setSectionForm({ title: '' });
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

  // Publish section sekarang tidak lagi butuh blok summary (R-CMS-03/04
  // sudah dihapus) — syarat "year completed" yang butuh kuis & rangkuman
  // ada di level lain (R-QUIZ-05, R-PROG-07).
  async function togglePublish(section) {
    setError(null);
    try {
      await api.put(`/admin/sections/${section.id}`, {
        title: section.title,
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

  // ---------- DRAG & DROP REORDER (R-CMS-02) ----------
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

    setBlocks(reordered);
  }

  async function saveOrder() {
    setSavingOrder(true);
    setError(null);
    try {
      const orderedIds = blocks.map((b) => b.id);
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

  // ---------- RANGKUMAN WABAH (years.summary, R-YEAR-01) ----------
  async function saveSummary() {
    setSavingSummary(true);
    setError(null);
    try {
      const res = await api.put(`/admin/years/${yearId}`, {
        era_id: year.era_id,
        year: year.year,
        title: year.title,
        summary: summaryDraft,
      });
      setYear(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan rangkuman.');
    } finally {
      setSavingSummary(false);
    }
  }

  // ---------- VAKSIN TERKAIT (year_vaccine, CMS-05) ----------
  function toggleVaccine(vaccineId) {
    setAssignedVaccineIds((prev) =>
      prev.includes(vaccineId) ? prev.filter((id) => id !== vaccineId) : [...prev, vaccineId]
    );
  }

  async function saveVaccines() {
    setSavingVaccines(true);
    setError(null);
    try {
      const res = await api.post(`/admin/years/${yearId}/assign-vaccines`, {
        vaccine_ids: assignedVaccineIds,
      });
      setAssignedVaccineIds((res.data.vaccines || []).map((v) => v.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan vaksin terkait.');
    } finally {
      setSavingVaccines(false);
    }
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {year ? `${year.year} — ${year.title}` : `Tahun #${yearId}`}
              </h1>
              {era && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent.hex }} />
                  {era.name}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/quizzes?year=${yearId}`)}>
              <HelpCircle className="h-4 w-4" /> Kelola Kuis
              {year?.quiz && (
                <Badge variant={year.quiz.is_published ? 'success' : 'secondary'} className="ml-1">
                  {year.quiz.is_published ? 'Published' : 'Draft'}
                </Badge>
              )}
            </Button>
          </div>
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
                {!editingSectionId && (
                  <p className="text-xs text-muted-foreground">
                    Section baru selalu draft (R-ADMIN-03) & otomatis mendapat urutan berikutnya
                    (dasar sequential unlock, R-SECT-01).
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
                        <span className="shrink-0 text-xs font-mono text-muted-foreground">#{section.order}</span>
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
                  : 'Drag baris untuk mengurutkan (R-CMS-02).'}
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
                      {blockForm.type === 'text' ? (
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
                          className="flex items-start gap-2 rounded-lg border bg-background p-3 cursor-grab active:cursor-grabbing"
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

        {/* ---------- KANAN: RANGKUMAN WABAH & VAKSIN TERKAIT — level TAHUN ---------- */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rangkuman Wabah</CardTitle>
              <CardDescription>
                years.summary (R-YEAR-01) — wajib terisi sebelum kuis tahun ini bisa di-publish (R-QUIZ-05).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingContext ? (
                <p className="text-sm text-muted-foreground">Memuat...</p>
              ) : (
                <>
                  <Textarea
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    rows={6}
                    placeholder="Rangkuman wabah ini, ditampilkan setelah semua section selesai dibaca (INFO-04)..."
                  />
                  <Button size="sm" onClick={saveSummary} disabled={savingSummary}>
                    {savingSummary ? 'Menyimpan...' : 'Simpan Rangkuman'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gamify/10 text-gamify">
                  <Syringe className="h-3.5 w-3.5" />
                </span>
                Vaksin Terkait
              </CardTitle>
              <CardDescription>
                CMS-05 — vaksin untuk tahun ini (year_vaccine). Semua ter-unlock bersamaan saat status
                &quot;year completed&quot; tercapai (R-VAC-01/02): seluruh section published selesai dibaca
                DAN kuis tahun ini sudah dikerjakan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vaccines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada data vaksin. Tambahkan dulu di{' '}
                  <Link to="/vaccines" className="font-medium text-foreground underline underline-offset-2">
                    Kelola Vaksin
                  </Link>.
                </p>
              ) : (
                <>
                  <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                    {vaccines.map((vaccine) => (
                      <li key={vaccine.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-secondary/50">
                          <input
                            type="checkbox"
                            checked={assignedVaccineIds.includes(vaccine.id)}
                            onChange={() => toggleVaccine(vaccine.id)}
                            className="h-4 w-4 rounded border-input accent-foreground"
                          />
                          {vaccine.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={saveVaccines} size="sm" className="mt-3" disabled={savingVaccines}>
                    {savingVaccines ? 'Menyimpan...' : 'Simpan Vaksin Terkait'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}