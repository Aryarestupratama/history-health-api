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

// Menggantikan FigureManager.jsx (Architecture.md §4.8 — collectible card:
// tokoh -> vaksin). Field mengikuti migrasi `vaccines` (progress.md):
// name, photo, manufacturer, disease_target, year_introduced, description.
const EMPTY_FORM = {
  name: '',
  photo: '',
  manufacturer: '',
  disease_target: '',
  year_introduced: '',
  description: '',
};

export default function VaccineManager() {
  const { confirm, dialog } = useConfirm();

  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVaccines();
  }, []);

  async function fetchVaccines() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/vaccines');
      setVaccines(res.data);
    } catch (err) {
      setError('Gagal memuat daftar vaksin.');
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
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        photo: form.photo || null,
        manufacturer: form.manufacturer || null,
        disease_target: form.disease_target,
        year_introduced: form.year_introduced ? Number(form.year_introduced) : null,
        description: form.description,
      };
      if (editingId) {
        await api.put(`/admin/vaccines/${editingId}`, payload);
      } else {
        await api.post('/admin/vaccines', payload);
      }
      resetForm();
      fetchVaccines();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan vaksin.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(vaccine) {
    setEditingId(vaccine.id);
    setForm({
      name: vaccine.name || '',
      photo: vaccine.photo || '',
      manufacturer: vaccine.manufacturer || '',
      disease_target: vaccine.disease_target || '',
      year_introduced: vaccine.year_introduced != null ? String(vaccine.year_introduced) : '',
      description: vaccine.description || '',
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError(null);
  }

  async function handleDelete(vaccine) {
    const ok = await confirm({
      title: `Hapus vaksin "${vaccine.name}"?`,
      description: 'Ini juga akan melepas relasinya dari semua tahun (wabah) terkait. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/vaccines/${vaccine.id}`);
      fetchVaccines();
    } catch (err) {
      setError('Gagal menghapus vaksin.');
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola Vaksin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data vaksin untuk collectible card di aplikasi mobile. Assign ke tahun (wabah) dilakukan
            di halaman workspace tahun.
          </p>
        </div>
        <Button onClick={openAddForm} className="bg-gamify text-white hover:bg-gamify/90">
          <Plus className="h-4 w-4" /> Tambah Vaksin
        </Button>
      </div>

      {error && !showForm && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : vaccines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada vaksin.</p>
      ) : (
        <div className="rounded-lg border border-l-4 border-l-gamify">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Vaksin</TableHead>
                <TableHead>Penyakit Target</TableHead>
                <TableHead>Produsen</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccines.map((vaccine) => (
                <TableRow key={vaccine.id}>
                  <TableCell className="font-medium">
                    {vaccine.name}
                    {vaccine.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs font-normal text-muted-foreground">
                        {vaccine.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{vaccine.disease_target}</TableCell>
                  <TableCell className="text-muted-foreground">{vaccine.manufacturer || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{vaccine.year_introduced || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(vaccine)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(vaccine)}>
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

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vaksin' : 'Vaksin Baru'}</DialogTitle>
            <DialogDescription>
              Data ini dipakai sebagai collectible card di aplikasi mobile.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form id="vaccine-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Vaksin</Label>
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
                <Label>Produsen</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tahun Diperkenalkan</Label>
                <Input
                  type="number"
                  value={form.year_introduced}
                  onChange={(e) => setForm({ ...form, year_introduced: e.target.value })}
                  placeholder="mis. 1955"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Penyakit Target</Label>
              <Input
                value={form.disease_target}
                onChange={(e) => setForm({ ...form, disease_target: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi Peran dalam Sejarah Kesehatan</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                required
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
            <Button type="submit" form="vaccine-form" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Update Vaksin' : 'Tambah Vaksin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}