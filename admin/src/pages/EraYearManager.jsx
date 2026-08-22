import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    const ok = await confirm({
      title: `Hapus era "${era.name}"?`,
      description: 'Ini akan menghapus semua tahun & section di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
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

  // Daftar tahun yang sudah terisi, diurutkan, buat ditampilkan sebagai info ringkas
  const sortedYearNumbers = [...years].map((y) => y.year).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {dialog}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kelola Era & Tahun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur 3 masa sejarah dan tahun-tahun wabah di dalamnya.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---------- KOLOM ERA ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Era</CardTitle>
            {!showEraForm && (
              <Button size="sm" onClick={openAddEraForm}>
                <Plus className="h-4 w-4" /> Tambah Era
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showEraForm && (
              <form onSubmit={handleEraSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{editingEraId ? 'Edit Era' : 'Era Baru'}</p>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetEraForm}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
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
                  <Label>Urutan (otomatis, bisa diubah)</Label>
                  <Input
                    type="number"
                    value={eraForm.order}
                    onChange={(e) => setEraForm({ ...eraForm, order: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm">{editingEraId ? 'Update Era' : 'Tambah Era'}</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetEraForm}>Batal</Button>
                </div>
              </form>
            )}

            {loadingEras ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : eras.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada era.</p>
            ) : (
              <ul className="space-y-2">
                {eras.map((era) => (
                  <li
                    key={era.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors',
                      selectedEra?.id === era.id ? 'border-primary/40 bg-secondary' : 'hover:bg-secondary/50'
                    )}
                  >
                    <button
                      onClick={() => setSelectedEra(era)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium">
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: getEraAccent(era.slug).hex }}
                          title={getEraAccent(era.slug).label}
                        />
                        <span className="text-muted-foreground">{era.order}.</span> {era.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{era.slug}</p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditEra(era)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteEra(era)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------- KOLOM YEAR ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Tahun {selectedEra ? `— ${selectedEra.name}` : ''}</CardTitle>
            {selectedEra && !showYearForm && (
              <Button size="sm" onClick={openAddYearForm}>
                <Plus className="h-4 w-4" /> Tambah Tahun
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedEra ? (
              <p className="text-sm text-muted-foreground">Pilih era di kiri dulu untuk melihat/menambah tahun.</p>
            ) : (
              <>
                <div className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
                  <span className="font-medium">Tahun yang sudah diinput:</span>{' '}
                  {sortedYearNumbers.length === 0 ? (
                    <span className="text-muted-foreground">belum ada</span>
                  ) : (
                    <span className="text-muted-foreground">{sortedYearNumbers.join(', ')}</span>
                  )}
                </div>

                {showYearForm && (
                  <form onSubmit={handleYearSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{editingYearId ? 'Edit Tahun' : 'Tahun Baru'}</p>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetYearForm}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tahun</Label>
                      <Input
                        type="number"
                        value={yearForm.year}
                        onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                        required
                      />
                      {yearForm.year && sortedYearNumbers.includes(Number(yearForm.year)) && editingYearId === null && (
                        <p className="text-xs text-warning">⚠ Tahun ini sudah pernah diinput sebelumnya</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Judul</Label>
                      <Input
                        value={yearForm.title}
                        onChange={(e) => setYearForm({ ...yearForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm">{editingYearId ? 'Update Tahun' : 'Tambah Tahun'}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={resetYearForm}>Batal</Button>
                    </div>
                  </form>
                )}

                {loadingYears ? (
                  <p className="text-sm text-muted-foreground">Memuat...</p>
                ) : years.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada tahun di era ini.</p>
                ) : (
                  <ul className="space-y-2">
                    {[...years]
                      .sort((a, b) => a.year - b.year)
                      .map((year) => (
                        <li key={year.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                          <p className="min-w-0 flex-1 truncate text-sm">
                            <span className="font-medium">{year.year}</span>{' '}
                            <span className="text-muted-foreground">— {year.title}</span>
                          </p>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditYear(year)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteYear(year)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
