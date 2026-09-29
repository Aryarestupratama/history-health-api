import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import {
  DataCard,
  EmptyState,
  Field,
  InitialsAvatar,
  InlineError,
  PageHeader,
  PasswordInput,
  TableSkeleton,
  primaryButtonClass,
} from '@/components/page-kit';

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
//
// REDESIGN: seluruh gaya level-halaman (header, kartu tabel, skeleton,
// empty state, error, avatar, field, input password) diambil dari
// `@/components/page-kit` supaya konsisten dengan halaman admin lain.
// Logic CRUD (fetch/tambah/hapus + guard) TIDAK berubah.
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

  const addButton = (
    <Button onClick={openAddForm} className={primaryButtonClass}>
      <Plus className="h-4 w-4" /> Tambah Admin
    </Button>
  );

  return (
    <div className="space-y-6">
      {dialog}

      <PageHeader
        title="Kelola Admin"
        count={loading ? null : admins.length}
        description="Tambah atau hapus akun admin. Semua admin punya akses setara, tanpa sub-level. Untuk ganti nama/password akun sendiri, buka menu Profil."
        actions={addButton}
      />

      {error && !showForm && <InlineError message={error} onRetry={fetchAdmins} />}

      {loading ? (
        <TableSkeleton rows={3} />
      ) : admins.length === 0 ? (
        // Kalau fetch gagal, pesan error di atas sudah cukup -- jangan
        // tambah "Belum ada admin" yang menyesatkan (data belum tentu kosong).
        !error && (
          <EmptyState
            icon={ShieldCheck}
            title="Belum ada admin"
            description="Tambahkan akun admin pertama untuk mulai mengelola konten."
            action={addButton}
          />
        )
      ) : (
        <DataCard className="duration-500 animate-in fade-in slide-in-from-bottom-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-16 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin, index) => {
                const isSelf = admin.id === currentUser?.id;
                const disableDelete = isSelf || isLastAdmin;
                const deleteHint = isSelf
                  ? 'Tidak bisa menghapus akun sendiri'
                  : isLastAdmin
                  ? 'Tidak bisa menghapus admin terakhir'
                  : 'Hapus';

                return (
                  <TableRow
                    key={admin.id}
                    // Baris muncul berurutan (maks 8 langkah stagger).
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: 'backwards' }}
                    className="duration-300 animate-in fade-in"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={admin.name} />
                        <span className="font-medium">{admin.name}</span>
                        {isSelf && <Badge variant="gamify">Anda</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        {/* Tooltip dipasang di <span> pembungkus, bukan di
                            tombol -- tombol disabled tidak menerima event
                            hover, jadi `title` di dalamnya tidak andal. */}
                        <span title={deleteHint} className="inline-flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            disabled={disableDelete}
                            aria-label={`Hapus admin ${admin.name}`}
                            onClick={() => handleDelete(admin)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataCard>
      )}

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gamify/10 text-gamify">
              <UserPlus className="h-5 w-5" />
            </div>
            <DialogTitle>Admin Baru</DialogTitle>
            <DialogDescription>
              Buat akun admin baru. Akun langsung aktif tanpa flow invite email.
            </DialogDescription>
          </DialogHeader>

          {error && <InlineError message={error} />}

          <form id="admin-form" onSubmit={handleSubmit} className="space-y-4">
            <Field id="admin-name" label="Nama">
              <Input
                id="admin-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="off"
                required
              />
            </Field>
            <Field id="admin-email" label="Email">
              {/* autoComplete="off": mencegah browser mengisi otomatis email
                  admin yang sedang login ke form akun BARU. */}
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="off"
                required
              />
            </Field>
            <Field id="admin-password" label="Password" hint="Minimal 8 karakter.">
              {/* autoComplete="new-password": password tersimpan admin yang
                  sedang login tidak boleh terisi otomatis di sini. */}
              <PasswordInput
                id="admin-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
            <Button type="submit" form="admin-form" className={primaryButtonClass} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Tambah Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}