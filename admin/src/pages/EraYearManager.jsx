import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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

  function selectEra(era) {
    setSelectedEraId(era.id);
    resetYearForm();
    if (!yearsByEra[era.id]) fetchYears(era.id);
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
      if (selectedEraId === era.id) setSelectedEraId(null);
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
      fetchYears(selectedEra.id);
    } catch (err) {
      setError('Gagal menghapus tahun.');
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kelola Era & Tahun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          3 masa sejarah sudah ditetapkan (Kolonial, Kemerdekaan, Modern). Klik baris era untuk mengelola tahun-tahun wabah di dalamnya.
        </p>
      </div>

      {error && !showEraForm && !showYearForm && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ---------- Tabel Era ---------- */}
      {loadingEras ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : eras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada era.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nama Era</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eras.map((era) => {
                const accent = getEraAccent(era.slug);
                const isSelected = selectedEraId === era.id;
                return (
                  <TableRow
                    key={era.id}
                    onClick={() => selectEra(era)}
                    className={isSelected ? 'cursor-pointer bg-secondary/60' : 'cursor-pointer'}
                    style={{ borderLeft: `4px solid ${accent.hex}` }}
                  >
                    <TableCell className="text-muted-foreground">{era.order}</TableCell>
                    <TableCell className="font-medium">{era.name}</TableCell>
                    <TableCell className="text-muted-foreground">{era.slug}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {era.description || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditEra(era);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEra(era);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ---------- Tabel Tahun (era terpilih) ---------- */}
      {selectedEra && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Tahun — {selectedEra.name}</h2>
            <Button size="sm" onClick={openAddYearForm}>
              <Plus className="h-4 w-4" /> Tambah Tahun
            </Button>
          </div>

          {loadingYears && !yearsByEra[selectedEra.id] ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : selectedEraYears.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tahun di era ini.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Tahun</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEraYears.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">{year.year}</TableCell>
                      <TableCell className="text-muted-foreground">{year.title}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditYear(year)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteYear(year)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
            <DialogTitle>{editingYearId ? 'Edit Tahun' : 'Tahun Baru'}</DialogTitle>
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