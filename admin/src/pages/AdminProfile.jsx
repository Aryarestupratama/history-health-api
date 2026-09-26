import { useState } from 'react';
import { toast } from 'sonner';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

// Profil (baru) -- pengganti tempat ganti password akun sendiri, yang
// SEBELUMNYA cuma bisa lewat "Edit" di Kelola Admin. Fitur Edit di Kelola
// Admin sudah dicabut total (lihat pages/AdminManager.jsx), jadi ini
// satu-satunya jalan bagi admin mana pun (termasuk untuk dirinya sendiri)
// untuk ganti password.
//
// Reuse endpoint yang SUDAH ADA & sudah dipakai Flutter (ChangePasswordScreen)
// -- POST /auth/password (AuthController::changePassword,
// ChangePasswordRequest: current_password, password [confirmed]). Tidak ada
// endpoint/FormRequest baru yang perlu dibuat di backend untuk fitur ini.
const EMPTY_FORM = { current_password: '', password: '', password_confirmation: '' };

export default function AdminProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi password baru tidak sama.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth/password', {
        current_password: form.current_password,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      toast.success('Password berhasil diubah.');
      setForm(EMPTY_FORM);
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Gagal mengubah password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola akun Anda sendiri, {user?.name}.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Ganti Password</CardTitle>
          <CardDescription>
            Masukkan password lama Anda, lalu password baru. Perubahan berlaku langsung setelah disimpan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Password Saat Ini</Label>
              <Input
                type="password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password Baru</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Konfirmasi Password Baru</Label>
              <Input
                type="password"
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}