import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Settings2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useConfirm } from '@/components/confirm-dialog';

export default function SectionManager() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

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
    const ok = await confirm({
      title: `Hapus section "${section.title}"?`,
      description: 'Ini akan menghapus semua blok konten di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
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
    <div className="space-y-6">
      {dialog}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kelola Section</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih era lalu tahun untuk mengelola section informasi sejarah.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1.4fr]">
        {/* ---------- KOLOM ERA ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Era</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEras ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              <ul className="space-y-2">
                {eras.map((era) => (
                  <li key={era.id}>
                    <button
                      onClick={() => setSelectedEra(era)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                        selectedEra?.id === era.id ? 'border-primary/40 bg-secondary font-medium' : 'hover:bg-secondary/50'
                      )}
                    >
                      <span className="text-muted-foreground">{era.order}.</span> {era.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------- KOLOM TAHUN ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Tahun {selectedEra ? `— ${selectedEra.name}` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedEra ? (
              <p className="text-sm text-muted-foreground">Pilih era di kiri dulu.</p>
            ) : loadingYears ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : years.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada tahun di era ini.</p>
            ) : (
              <ul className="space-y-2">
                {[...years]
                  .sort((a, b) => a.year - b.year)
                  .map((year) => (
                    <li key={year.id}>
                      <button
                        onClick={() => setSelectedYear(year)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                          selectedYear?.id === year.id ? 'border-primary/40 bg-secondary' : 'hover:bg-secondary/50'
                        )}
                      >
                        <span className="font-medium">{year.year}</span>{' '}
                        <span className="text-muted-foreground">— {year.title}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------- KOLOM SECTION ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Section {selectedYear ? `— ${selectedYear.year}` : ''}</CardTitle>
            {selectedYear && !showForm && (
              <Button size="sm" onClick={openAddForm}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedYear ? (
              <p className="text-sm text-muted-foreground">Pilih tahun di tengah dulu untuk melihat/menambah section.</p>
            ) : (
              <>
                {showForm && (
                  <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{editingId ? 'Edit Section' : 'Section Baru'}</p>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetForm}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Judul</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Link Kuis (Upresenter, opsional)</Label>
                      <Input
                        value={form.quiz_link}
                        onChange={(e) => setForm({ ...form, quiz_link: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    {!editingId && (
                      <p className="text-xs text-muted-foreground">
                        Section baru selalu dibuat sebagai draft (R-ADMIN-03). Publish dilakukan setelah blok konten
                        diisi, minimal 1 blok rangkuman (R-CMS-04).
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm">{editingId ? 'Update Section' : 'Tambah Section'}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={resetForm}>Batal</Button>
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
                      <li key={section.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">{section.title}</p>
                          <Badge variant={section.is_published ? 'success' : 'secondary'}>
                            {section.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/sections/${section.id}`)}>
                            <Settings2 className="h-3.5 w-3.5" /> Blok Konten & Tokoh
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(section)} title="Edit Info">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(section)} title={section.is_published ? 'Unpublish' : 'Publish'}>
                            {section.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(section)} title="Hapus">
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
