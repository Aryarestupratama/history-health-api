import { useMemo, useState } from 'react';
import { Check, Circle, KeyRound, Lightbulb, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DataCard,
  Field,
  FormCard,
  InitialsAvatar,
  InlineError,
  PageHeader,
  PasswordInput,
  primaryButtonClass,
} from '@/components/page-kit';

// Profil -- tempat admin (siapa pun, termasuk untuk dirinya sendiri) mengganti
// password. Fitur Edit di Kelola Admin sudah dicabut total (lihat
// pages/AdminManager.jsx), jadi ini satu-satunya jalannya.
//
// Reuse endpoint yang SUDAH ADA & sudah dipakai Flutter (ChangePasswordScreen)
// -- POST /auth/password (AuthController::changePassword,
// ChangePasswordRequest: current_password, password [confirmed]). Tidak ada
// endpoint/FormRequest baru yang perlu dibuat di backend untuk fitur ini.
//
// REDESIGN (relayout): form di kiri, panel identitas + tips di kanan
// (sticky di layar lebar, menumpuk di bawah form di layar sempit). Titik
// utama halaman = umpan balik password langsung: meter kekuatan + daftar
// syarat yang tercentang sendiri saat mengetik. SEMUA itu hanya saran
// tampilan -- aturan yang benar-benar dipakai server tetap sama (min 8
// karakter + konfirmasi cocok), dan logic kirim ke API TIDAK berubah.
const EMPTY_FORM = { current_password: '', password: '', password_confirmation: '' };
const MIN_LENGTH = 8;

// Tingkat kekuatan -> label, jumlah segmen bar yang terisi, warna (token
// semantik proyek: destructive/warning/info/success).
const STRENGTH_LEVELS = [
  { label: 'Lemah', segments: 1, bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Cukup', segments: 2, bar: 'bg-warning', text: 'text-warning' },
  { label: 'Baik', segments: 3, bar: 'bg-info', text: 'text-info' },
  { label: 'Kuat', segments: 4, bar: 'bg-success', text: 'text-success' },
];

function evaluatePassword(password, current) {
  const hasLength = password.length >= MIN_LENGTH;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /\d/.test(password) || /[^A-Za-z0-9]/.test(password);
  const isDifferent = password.length > 0 && current.length > 0 && password !== current;

  // Skor: panjang paling berpengaruh (>=12 karakter dihargai lebih), lalu
  // variasi karakter. Di bawah panjang minimal, level dikunci "Lemah".
  let score = 0;
  if (hasLength) score += 1;
  if (password.length >= 12) score += 1;
  if (hasMixedCase) score += 1;
  if (hasNumberOrSymbol) score += 1;

  let level = null;
  if (password.length > 0) {
    if (!hasLength || score <= 1) level = STRENGTH_LEVELS[0];
    else if (score === 2) level = STRENGTH_LEVELS[1];
    else if (score === 3) level = STRENGTH_LEVELS[2];
    else level = STRENGTH_LEVELS[3];
  }

  return { hasLength, hasMixedCase, hasNumberOrSymbol, isDifferent, level };
}

/** Bar 4 segmen + label tingkat kekuatan. Bergeser halus saat mengetik. */
function StrengthMeter({ level }) {
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {STRENGTH_LEVELS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full bg-secondary transition-colors duration-300 motion-reduce:transition-none',
              level && i < level.segments && level.bar
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {level ? (
          <>
            Kekuatan password: <span className={cn('font-medium', level.text)}>{level.label}</span>
          </>
        ) : (
          'Ketik password baru untuk melihat kekuatannya.'
        )}
      </p>
    </div>
  );
}

/** Satu baris syarat: ikon centang saat terpenuhi, lingkaran kosong kalau belum. */
function Requirement({ met, children }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 motion-reduce:transition-none',
          met
            ? 'border-success bg-success text-success-foreground'
            : 'border-border text-transparent'
        )}
        aria-hidden="true"
      >
        {met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <Circle className="h-2.5 w-2.5" />}
      </span>
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{children}</span>
      <span className="sr-only">{met ? '(terpenuhi)' : '(belum terpenuhi)'}</span>
    </li>
  );
}

export default function AdminProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const check = useMemo(
    () => evaluatePassword(form.password, form.current_password),
    [form.password, form.current_password]
  );

  const confirmTyped = form.password_confirmation.length > 0;
  const passwordsMatch = confirmTyped && form.password === form.password_confirmation;
  const isDirty = Object.values(form).some((v) => v.length > 0);
  // Tombol baru aktif kalau syarat yang benar-benar dicek server sudah
  // terpenuhi. Pengecekan mismatch di handleSubmit tetap ada sebagai jaring
  // pengaman terakhir.
  const canSubmit = form.current_password.length > 0 && check.hasLength && passwordsMatch;

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

  function handleReset() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  const confirmHint = confirmTyped ? (
    <span
      aria-live="polite"
      className={cn('font-medium', passwordsMatch ? 'text-success' : 'text-destructive')}
    >
      {passwordsMatch ? 'Password cocok.' : 'Belum sama dengan password baru.'}
    </span>
  ) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Lihat akun yang sedang login dan ganti password Anda."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ------------------------------------------------ Form ganti password */}
        <FormCard
          icon={KeyRound}
          title="Ganti password"
          description="Masukkan password saat ini, lalu tentukan password baru. Berlaku langsung setelah disimpan."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <InlineError message={error} />}

            {/* autoComplete: password lama = current-password, dua sisanya
                new-password supaya password manager browser menawarkan
                pembaruan (bukan mengisi ulang password lama ke kolom baru). */}
            <Field id="current-password" label="Password saat ini">
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                required
              />
            </Field>

            <div className="border-t" />

            <div className="space-y-4">
              <Field id="new-password" label="Password baru">
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  aria-describedby="password-requirements"
                  required
                  minLength={MIN_LENGTH}
                />
              </Field>

              {/* Umpan balik langsung, tepat di bawah kolom yang sedang diketik. */}
              <div
                id="password-requirements"
                className="space-y-3 rounded-lg border bg-secondary/30 p-3.5"
              >
                <StrengthMeter level={check.level} />
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  <Requirement met={check.hasLength}>Minimal {MIN_LENGTH} karakter (wajib)</Requirement>
                  <Requirement met={check.hasMixedCase}>Huruf besar dan kecil</Requirement>
                  <Requirement met={check.hasNumberOrSymbol}>Ada angka atau simbol</Requirement>
                  <Requirement met={check.isDifferent}>Beda dari password saat ini</Requirement>
                </ul>
              </div>

              <Field id="confirm-password" label="Ulangi password baru" hint={confirmHint}>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                  required
                  minLength={MIN_LENGTH}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
              {isDirty && !saving && (
                <Button type="button" variant="ghost" onClick={handleReset}>
                  Kosongkan
                </Button>
              )}
              <Button type="submit" className={primaryButtonClass} disabled={saving || !canSubmit}>
                {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </div>
          </form>
        </FormCard>

        {/* ------------------------------------- Panel samping: identitas + tips */}
        <DataCard className="lg:sticky lg:top-6">
          <div className="p-5">
            <div className="flex items-center gap-3.5">
              <InitialsAvatar name={user?.name} className="h-14 w-14 text-lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">{user?.name}</p>
                <Badge variant="gamify" className="mt-1.5">
                  Administrator
                </Badge>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              {user?.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="sr-only">Email</dt>
                    <dd className="break-all">{user.email}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="sr-only">Akses</dt>
                  <dd className="text-muted-foreground">
                    Akses penuh, setara dengan admin lain.
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="border-t bg-secondary/30 p-5">
            <div className="mb-2.5 flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" />
              Password yang baik
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>Gunakan password yang tidak dipakai di layanan lain.</li>
              <li>Panjang lebih penting daripada rumit: 12 karakter atau lebih sudah kuat.</li>
              <li>Password baru dipakai untuk login berikutnya.</li>
            </ul>
          </div>
        </DataCard>
      </div>
    </div>
  );
}