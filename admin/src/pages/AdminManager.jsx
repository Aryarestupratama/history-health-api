import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// Kelola Admin (baru) -- CRUD akun admin, isi langsung tanpa flow invite
// email. Reuse tabel `users` (role=admin), endpoint /admin/admins
// (lihat routes/api.php & AdminUserController.php). Semua admin setara,
// tanpa sub-level (R-ADMIN-01) -- yang dibatasi di sini hanya guard
// self-delete & last-admin-delete (lihat backend).
const EMPTY_FORM = { name: '', email: '', password: '' };

export default function AdminManager() {
  const { user: currentUser } = useAuth();
  const { confirm, dialog } = useConfirm();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/admins');
      setAdmins(res.data);
    } catch (err) {
      setError('Gagal memuat daftar admin.');
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
      if (editingId) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/admins/${editingId}`, payload);
      } else {
        await api.post('/admin/admins', {
          name: form.name,
          email: form.email,
          password: form.password,
        });
      }
      resetForm();
      fetchAdmins();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Gagal menyimpan akun admin.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(admin) {
    setEditingId(admin.id);
    setForm({ name: admin.name || '', email: admin.email || '', password: '' });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError(null);
  }

  async function handleDelete(admin) {
    const ok = await confirm({
      title: `Hapus akun admin "${admin.name}"?`,
      description: 'Akun ini tidak akan bisa login lagi setelah dihapus. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/admins/${admin.id}`);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus akun admin.');
    }
  }

  const isLastAdmin = admins.length <= 1;

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambah atau kelola akun admin. Semua admin punya akses setara, tanpa sub-level.
          </p>
        </div>
        <Button onClick={openAddForm} className="bg-gamify text-white hover:bg-gamify/90">
          <Plus className="h-4 w-4" /> Tambah Admin
        </Button>
      </div>

      {error && !showForm && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada admin.</p>
      ) : (
        <div className="rounded-lg border border-l-4 border-l-gamify">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = admin.id === currentUser?.id;
                const disableDelete = isSelf || isLastAdmin;
                return (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.name} {isSelf && <span className="text-xs text-muted-foreground">(Anda)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(admin)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive disabled:opacity-30"
                          disabled={disableDelete}
                          title={
                            isSelf
                              ? 'Tidak bisa menghapus akun sendiri'
                              : isLastAdmin
                              ? 'Tidak bisa menghapus admin terakhir'
                              : 'Hapus'
                          }
                          onClick={() => handleDelete(admin)}
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

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Admin' : 'Admin Baru'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Ubah nama, email, atau reset password akun admin ini.'
                : 'Buat akun admin baru. Akun langsung aktif tanpa flow invite email.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form id="admin-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{editingId ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 8 karakter"
                required={!editingId}
                minLength={8}
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
            <Button type="submit" form="admin-form" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Update Admin' : 'Tambah Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}