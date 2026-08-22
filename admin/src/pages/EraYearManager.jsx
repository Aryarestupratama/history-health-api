import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedEraId, setExpandedEraId] = useState(null);
  // Tahun di-cache per era, di-fetch on-demand pas card era di-expand pertama kali
  const [yearsByEra, setYearsByEra] = useState({});
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

  function toggleExpand(era) {
    if (expandedEraId === era.id) {
      setExpandedEraId(null);
      resetYearForm();
      return;
    }
    setExpandedEraId(era.id);
    resetYearForm();
    if (!yearsByEra[era.id]) fetchYears(era.id);
  }

  // ---------- ERA CRUD ----------
  function handleEraNameChange(name) {
    setEraForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  }

  function openAddEraForm() {
    resetEraForm();
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
      if (expandedEraId === era.id) setExpandedEraId(null);
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

  async function handleYearSubmit(e, era) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        era_id: era.id,
        year: Number(yearForm.year),
        title: yearForm.title,
      };
      if (editingYearId) {
        await api.put(`/admin/years/${editingYearId}`, payload);
      } else {
        await api.post('/admin/years', payload);
      }
      resetYearForm();
      fetchYears(era.id);
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

  async function handleDeleteYear(year, era) {
    const ok = await confirm({
      title: `Hapus tahun "${year.year} - ${year.title}"?`,
      description: 'Ini akan menghapus semua section di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/years/${year.id}`);
      fetchYears(era.id);
    } catch (err) {
      setError('Gagal menghapus tahun.');
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola Era & Tahun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur 3 masa sejarah dan tahun-tahun wabah di dalamnya. Klik kartu era untuk melihat/mengelola tahun.
          </p>
        </div>
        {!showEraForm && (
          <Button onClick={openAddEraForm}>
            <Plus className="h-4 w-4" /> Tambah Era
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showEraForm && (
        <Card className="max-w-xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{editingEraId ? 'Edit Era' : 'Era Baru'}</CardTitle>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetEraForm}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEraSubmit} className="space-y-4">
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
                <Button type="submit">{editingEraId ? 'Update Era' : 'Tambah Era'}</Button>
                <Button type="button" variant="outline" onClick={resetEraForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loadingEras ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : eras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada era.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {eras.map((era) => {
            const isExpanded = expandedEraId === era.id;
            const eraYears = [...(yearsByEra[era.id] || [])].sort((a, b) => a.year - b.year);
            const accent = getEraAccent(era.slug);

            return (
              <Card key={era.id} className={cn(isExpanded && 'sm:col-span-2 xl:col-span-3')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => toggleExpand(era)} className="min-w-0 flex-1 text-left">
                      <p className="flex items-center gap-2 truncate font-medium">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: accent.hex }}
                          title={accent.label}
                        />
                        <span className="text-muted-foreground">{era.order}.</span> {era.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{era.slug}</p>
                      {era.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{era.description}</p>
                      )}
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditEra(era)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteEra(era)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(era)}>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Tahun — {era.name}</p>
                        {!showYearForm && (
                          <Button size="sm" onClick={openAddYearForm}>
                            <Plus className="h-4 w-4" /> Tambah Tahun
                          </Button>
                        )}
                      </div>

                      {eraYears.length > 0 && (
                        <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                          Tahun yang sudah diinput: {eraYears.map((y) => y.year).join(', ')}
                        </div>
                      )}

                      {showYearForm && (
                        <form
                          onSubmit={(e) => handleYearSubmit(e, era)}
                          className="space-y-3 rounded-lg border bg-secondary/30 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{editingYearId ? 'Edit Tahun' : 'Tahun Baru'}</p>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetYearForm}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
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
                          {yearForm.year && eraYears.some((y) => y.year === Number(yearForm.year)) && editingYearId === null && (
                            <p className="text-xs text-warning">⚠ Tahun ini sudah pernah diinput sebelumnya</p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button type="submit" size="sm">{editingYearId ? 'Update Tahun' : 'Tambah Tahun'}</Button>
                            <Button type="button" variant="outline" size="sm" onClick={resetYearForm}>Batal</Button>
                          </div>
                        </form>
                      )}

                      {loadingYears && !yearsByEra[era.id] ? (
                        <p className="text-sm text-muted-foreground">Memuat...</p>
                      ) : eraYears.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada tahun di era ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {eraYears.map((year) => (
                            <Card key={year.id} className="bg-secondary/20">
                              <CardContent className="flex items-center justify-between gap-2 p-3">
                                <p className="min-w-0 flex-1 truncate text-sm">
                                  <span className="font-medium">{year.year}</span>{' '}
                                  <span className="text-muted-foreground">— {year.title}</span>
                                </p>
                                <div className="flex shrink-0 gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditYear(year)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteYear(year, era)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}