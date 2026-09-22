import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';
import { getEraAccent } from '@/config/branding';

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
  const { confirm, dialog } = useConfirm();

  const [eras, setEras] = useState([]);
  const [selectedEraId, setSelectedEraId] = useState(null);
  // Tahun di-cache per era, di-fetch on-demand pas era dipilih pertama kali
  const [yearsByEra, setYearsByEra] = useState({});
  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [error, setError] = useState(null);

  // Form state - Era (create sengaja tidak ada, lihat handleEraSubmit)
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
      setYearsByEra((prev) => ({ ...prev, [eraId]: res.data }));
    } catch (err) {
      setError('Gagal memuat daftar tahun.');
    } finally {
      setLoadingYears(false);
    }
  }

  function openEra(era) {
    setSelectedEraId(era.id);
    resetYearForm();
    if (!yearsByEra[era.id]) fetchYears(era.id);
  }

  function backToEraGrid() {
    setSelectedEraId(null);
  }

  const selectedEra = eras.find((e) => e.id === selectedEraId) || null;
  const selectedEraYears = [...(yearsByEra[selectedEraId] || [])].sort((a, b) => a.year - b.year);

  // ---------- ERA (edit-only, lihat catatan sebelumnya di progress.md) ----------
  function handleEraNameChange(name) {
    setEraForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  }

  // Catatan: create/store Era sengaja dihilangkan — 3 era (Kolonial/
  // Kemerdekaan/Modern) sudah paten diisi via EraSeeder, admin hanya
  // boleh edit (nama/deskripsi/urutan), bukan menambah era baru.
  async function handleEraSubmit(e) {
    e.preventDefault();
    if (!editingEraId) return; // guard: form ini sekarang hanya untuk edit
    setError(null);
    try {
      const payload = { ...eraForm, order: Number(eraForm.order) };
      await api.put(`/admin/eras/${editingEraId}`, payload);
      toast.success('Era berhasil diupdate');
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
    setError(null);
  }

  async function handleDeleteEra(era) {
    const ok = await confirm({
      title: `Hapus era "${era.name}"?`,
      description: 'Ini akan menghapus semua tahun & section di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/eras/${era.id}`);
      toast.success(`Era "${era.name}" berhasil dihapus`);
      if (selectedEraId === era.id) setSelectedEraId(null);
      fetchEras();
    } catch (err) {
      toast.error('Gagal menghapus era.');
    }
  }

  // ---------- YEAR CRUD ----------
  function openAddYearForm() {
    resetYearForm();
    setShowYearForm(true);
  }

  async function handleYearSubmit(e) {
    e.preventDefault();
    if (!selectedEra) return;
    setError(null);
    try {
      const payload = {
        era_id: selectedEra.id,
        year: Number(yearForm.year),
        title: yearForm.title,
      };
      if (editingYearId) {
        await api.put(`/admin/years/${editingYearId}`, payload);
        toast.success('Tahun berhasil diupdate');
      } else {
        await api.post('/admin/years', payload);
        toast.success('Tahun baru berhasil ditambahkan');
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
    setError(null);
  }

  async function handleDeleteYear(year) {
    const ok = await confirm({
      title: `Hapus tahun "${year.year} - ${year.title}"?`,
      description: 'Ini akan menghapus semua section di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/years/${year.id}`);
      toast.success(`Tahun "${year.year} — ${year.title}" berhasil dihapus`);
      fetchYears(selectedEra.id);
    } catch (err) {
      toast.error('Gagal menghapus tahun.');
    }
  }

  return (
    <div className="p-8">
      {dialog}

      <h1 className="mb-1 text-xl font-semibold text-zinc-900">Kelola Era & Tahun</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {selectedEra
          ? 'Kelola tahun-tahun wabah di dalam era ini.'
          : '3 masa sejarah sudah ditetapkan (Kolonial, Kemerdekaan, Modern). Klik salah satu untuk mengelola tahun-tahunnya.'}
      </p>

      {error && !showEraForm && !showYearForm && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedEra ? (
        <EraGrid eras={eras} loading={loadingEras} onSelect={openEra} onEdit={startEditEra} onDelete={handleDeleteEra} />
      ) : (
        <div>
          <button
            onClick={backToEraGrid}
            className="mb-4 flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
          >
            <ArrowLeft size={15} /> Kembali ke pilih masa
          </button>

          <YearGrid
            era={selectedEra}
            years={selectedEraYears}
            loading={loadingYears && !yearsByEra[selectedEra.id]}
            onAdd={openAddYearForm}
            onEdit={startEditYear}
            onDelete={handleDeleteYear}
          />
        </div>
      )}

      {/* ---------- Dialog Edit Era ---------- */}
      <Dialog open={showEraForm} onOpenChange={(open) => !open && resetEraForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Era</DialogTitle>
            <DialogDescription>
              Ubah nama, deskripsi, atau urutan tampil era ini. Era baru tidak bisa ditambah dari sini.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form id="era-form" onSubmit={handleEraSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={eraForm.name} onChange={(e) => handleEraNameChange(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (otomatis)</Label>
              <Input value={eraForm.slug} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                value={eraForm.description}
                onChange={(e) => setEraForm({ ...eraForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Urutan</Label>
              <Input
                type="number"
                value={eraForm.order}
                onChange={(e) => setEraForm({ ...eraForm, order: e.target.value })}
                required
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetEraForm}>Batal</Button>
            <Button type="submit" form="era-form">Update Era</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Dialog Tambah/Edit Tahun ---------- */}
      <Dialog open={showYearForm} onOpenChange={(open) => !open && resetYearForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEra && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getEraAccent(selectedEra.slug).hex }}
                />
              )}
              {editingYearId ? 'Edit Tahun' : 'Tahun Baru'}
              {selectedEra ? ` — ${selectedEra.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedEra ? `Tahun wabah dalam era ${selectedEra.name}.` : ''}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form id="year-form" onSubmit={handleYearSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tahun</Label>
                <Input
                  type="number"
                  value={yearForm.year}
                  onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Judul</Label>
                <Input
                  value={yearForm.title}
                  onChange={(e) => setYearForm({ ...yearForm, title: e.target.value })}
                  required
                />
              </div>
            </div>
            {yearForm.year &&
              selectedEraYears.some((y) => y.year === Number(yearForm.year)) &&
              editingYearId === null && (
                <p className="text-xs text-warning">⚠ Tahun ini sudah pernah diinput sebelumnya</p>
              )}
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetYearForm}>Batal</Button>
            <Button type="submit" form="year-form">{editingYearId ? 'Update Tahun' : 'Tambah Tahun'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------------------------------------- Era grid */

function EraGrid({ eras, loading, onSelect, onEdit, onDelete }) {
  if (loading) {
    return <p className="text-sm text-zinc-400">Memuat era…</p>;
  }
  if (eras.length === 0) {
    return <p className="text-sm text-zinc-400">Belum ada era.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {eras.map((era) => {
        const accent = getEraAccent(era.slug);
        return (
          <div
            key={era.id}
            onClick={() => onSelect(era)}
            role="button"
            tabIndex={0}
            className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border-l-4 bg-white p-6 text-left shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
            style={{ borderLeftColor: accent.hex }}
          >
            {/* Aksi edit/hapus — stopPropagation supaya tidak trigger onSelect */}
            <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/80 backdrop-blur hover:bg-zinc-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(era);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/80 text-destructive backdrop-blur hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(era);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Urutan {era.order}
              </span>
              <h3 className="mt-1 text-xl font-semibold text-zinc-900">{era.name}</h3>
              {era.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">{era.description}</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between text-sm text-zinc-400">
              <span>{era.years_count ?? '—'} tahun</span>
              <ChevronRight size={20} className="transition group-hover:translate-x-0.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Year grid */

function YearGrid({ era, years, loading, onAdd, onEdit, onDelete }) {
  const accent = getEraAccent(era.slug).hex;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <h2 className="text-base font-semibold text-zinc-900">{era.name}</h2>
        </div>
        <Button
          size="lg"
          onClick={onAdd}
          style={{ backgroundColor: accent }}
          className="px-5 py-5 text-base font-semibold text-white shadow-md hover:opacity-90"
        >
          <Plus size={20} /> Tambah Tahun Baru
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat tahun…</p>
      ) : years.length === 0 ? (
        <button
          onClick={onAdd}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-200 p-8 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600"
        >
          <Plus size={18} />
          <span className="text-xs">Belum ada tahun di era ini — klik untuk tambah</span>
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {years.map((y) => (
            <div
              key={y.id}
              className="group relative flex flex-col items-start gap-1.5 rounded-2xl border-l-4 bg-white p-5 text-left shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
              style={{ borderLeftColor: accent }}
            >
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-white/80 backdrop-blur hover:bg-zinc-100"
                  onClick={() => onEdit(y)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-white/80 text-destructive backdrop-blur hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(y)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <span className="text-sm font-medium text-zinc-400">{y.year}</span>
              <span className="line-clamp-2 pr-12 text-lg font-semibold text-zinc-900">{y.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}