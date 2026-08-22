import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, GripVertical, Plus, X, Pencil, Trash2 } from 'lucide-react';
import api from '../api';
import { cn } from '@/lib/utils';
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

export default function SectionEditor() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

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
    const ok = await confirm({ title: `Hapus blok "${block.type}" ini?` });
    if (!ok) return;
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

  if (loading) return <p className="text-sm text-muted-foreground">Memuat...</p>;
  if (!section) return <p className="text-sm text-muted-foreground">Section tidak ditemukan.</p>;

  const hasSummary = blocks.some((b) => b.type === 'summary');

  return (
    <div className="space-y-6">
      {dialog}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/sections')}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Section
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{section.title}</h1>
          <Badge variant={section.is_published ? 'success' : 'secondary'}>
            {section.is_published ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {section.year?.era?.name} — {section.year?.year} ({section.year?.title})
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ---------- BLOK KONTEN ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Blok Konten</CardTitle>
              <CardDescription className="mt-1">
                Drag baris untuk mengurutkan. Blok "Rangkuman" otomatis dipaksa ke posisi terakhir (R-CMS-03).
                {!hasSummary && ' Section wajib punya minimal 1 blok Rangkuman sebelum bisa di-publish (R-CMS-04).'}
              </CardDescription>
            </div>
            {!showForm && (
              <Button size="sm" onClick={openAddForm}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showForm && (
              <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{editingBlockId ? 'Edit Blok' : 'Blok Baru'}</p>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetForm}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipe</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => setForm({ ...form, type: value })}
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
                  {form.type === 'text' || form.type === 'summary' ? (
                    <Textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={5}
                      required
                    />
                  ) : (
                    <Input
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder={contentPlaceholder(form.type)}
                      required
                    />
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm">{editingBlockId ? 'Update Blok' : 'Tambah Blok'}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>Batal</Button>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(block)}>
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
          </CardContent>
        </Card>

        {/* ---------- TOKOH TERKAIT ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Tokoh Terkait</CardTitle>
            <CardDescription>CMS-05 — assign satu atau lebih tokoh ke section ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {figures.length === 0 ? (
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
