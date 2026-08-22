import { useState, useEffect } from 'react';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useConfirm } from '@/components/confirm-dialog';

const EMPTY_FORM = {
  name: '',
  photo: '',
  birth_date: '',
  death_date: '',
  family: '',
  role_description: '',
};

export default function FigureManager() {
  const { confirm, dialog } = useConfirm();

  const [figures, setFigures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchFigures();
  }, []);

  async function fetchFigures() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/figures');
      setFigures(res.data);
    } catch (err) {
      setError('Gagal memuat daftar tokoh.');
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name,
        photo: form.photo || null,
        birth_date: form.birth_date || null,
        death_date: form.death_date || null,
        family: form.family || null,
        role_description: form.role_description,
      };
      if (editingId) {
        await api.put(`/admin/figures/${editingId}`, payload);
      } else {
        await api.post('/admin/figures', payload);
      }
      resetForm();
      fetchFigures();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tokoh.');
    }
  }

  function startEdit(figure) {
    setEditingId(figure.id);
    setForm({
      name: figure.name || '',
      photo: figure.photo || '',
      birth_date: figure.birth_date || '',
      death_date: figure.death_date || '',
      family: figure.family || '',
      role_description: figure.role_description || '',
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function handleDelete(figure) {
    const ok = await confirm({
      title: `Hapus tokoh "${figure.name}"?`,
      description: 'Ini juga akan melepas relasinya dari semua section. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/figures/${figure.id}`);
      fetchFigures();
    } catch (err) {
      setError('Gagal menghapus tokoh.');
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola Tokoh</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data tokoh sejarah untuk collectible card di aplikasi mobile.
          </p>
        </div>
        {!showForm && (
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4" /> Tambah Tokoh
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="max-w-xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{editingId ? 'Edit Tokoh' : 'Tokoh Baru'}</CardTitle>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetForm}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Foto (link Google Drive)</Label>
                <Input
                  value={form.photo}
                  onChange={(e) => setForm({ ...form, photo: e.target.value })}
                  placeholder="https://drive.google.com/file/d/FILE_ID/view..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Wafat</Label>
                  <Input
                    type="date"
                    value={form.death_date}
                    onChange={(e) => setForm({ ...form, death_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Keluarga</Label>
                <Textarea
                  value={form.family}
                  onChange={(e) => setForm({ ...form, family: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Peran dalam Dunia Kesehatan</Label>
                <Textarea
                  value={form.role_description}
                  onChange={(e) => setForm({ ...form, role_description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit">{editingId ? 'Update Tokoh' : 'Tambah Tokoh'}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : figures.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada tokoh.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {figures.map((figure) => (
            <Card key={figure.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{figure.name}</p>
                    {(figure.birth_date || figure.death_date) && (
                      <p className="text-xs text-muted-foreground">
                        {figure.birth_date || '?'} – {figure.death_date || '?'}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(figure)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(figure)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {figure.role_description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{figure.role_description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
