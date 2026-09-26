import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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

// Kelola Admin -- CRUD akun admin, isi langsung tanpa flow invite email.
// Reuse tabel `users` (role=admin), endpoint /admin/admins (lihat
// routes/api.php & AdminUserController.php). Semua admin setara, tanpa
// sub-level (R-ADMIN-01) -- yang dibatasi di sini hanya guard self-delete
// & last-admin-delete (lihat backend).
//
// REVISI: fitur Edit dicabut total -- halaman ini sekarang cuma
// Tambah/Hapus. Ganti nama/email/password akun sendiri pindah ke menu
// Profil (lihat pages/AdminProfile.jsx), admin tidak bisa lagi mengedit
// data admin lain (atau akun sendiri) dari sini.
const EMPTY_FORM = { name: '', email: '', password: '' };

export default function AdminManager() {
  const { user: currentUser } = useAuth();
  const { confirm, dialog } = useConfirm();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
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
      await api.post('/admin/admins', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      toast.success('Admin baru berhasil ditambahkan');
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

  function resetForm() {
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
      toast.success(`Admin "${admin.name}" berhasil dihapus`);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus akun admin.');
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
            Tambah atau hapus akun admin. Semua admin punya akses setara, tanpa sub-level. Untuk
            ganti nama/password akun sendiri, buka menu Profil.
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
                <TableHead className="w-16 text-right">Aksi</TableHead>
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
                      <div className="flex justify-end">
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
            <DialogTitle>Admin Baru</DialogTitle>
            <DialogDescription>
              Buat akun admin baru. Akun langsung aktif tanpa flow invite email.
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
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
            <Button type="submit" form="admin-form" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Tambah Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}