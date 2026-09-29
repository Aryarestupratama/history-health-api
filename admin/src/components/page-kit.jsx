import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

/**
 * KIT DESAIN HALAMAN ADMIN -- satu-satunya sumber gaya level-halaman.
 *
 * REVISI: kit ini SEBELUMNYA punya komponen `Pill` dan tiga skeleton yang
 * dibangun dari nol (div + animate-pulse manual). Itu keputusan yang
 * salah -- proyek ini sudah punya `Badge` (varian success/warning/info/
 * gamify/destructive/secondary/outline, lihat components/ui/badge.jsx)
 * yang menutupi persis kebutuhan `Pill`, dan sekarang juga sudah punya
 * `Switch`/`Skeleton` asli dari shadcn (Radix-based, teruji, aksesibel).
 * Custom buatan sendiri SELALU kalah kualitas dari primitif yang sudah
 * teruji untuk kasus sesederhana ini -- salah satunya sempat menyebabkan
 * bug rendering nyata (huruf terpotong di toggle custom). Kit ini sekarang
 * MEMBUNGKUS primitif shadcn yang sudah ada, bukan menggantikannya.
 *
 * Aturan pakai (supaya semua halaman admin tetap konsisten):
 *  1. Setiap halaman diawali <PageHeader> (judul, deskripsi, aksi utama).
 *  2. Data tabel/daftar SELALU dibungkus <DataCard>.
 *     Halaman berbentuk form/pengaturan tunggal pakai <FormCard>.
 *  3. State memuat  -> <TableSkeleton> (tabel), <CardGridSkeleton> (grid
 *     kartu), atau <FormSkeleton> (form singleton) -- ketiganya sekarang
 *     cuma tata letak di atas <Skeleton> shadcn, bukan animasi sendiri.
 *     State kosong  -> <EmptyState>     (bukan teks polos).
 *     State error   -> <InlineError>    (+ onRetry kalau bisa diulang).
 *  4. Tombol aksi utama halaman pakai `primaryButtonClass` (warna gamify).
 *     Status/jumlah/label kecil pakai <Badge> shadcn LANGSUNG -- jangan
 *     bikin komponen pil baru, varian warnanya sudah cukup di badge.jsx.
 *  5. Field form pakai <Field> (label terhubung ke input lewat id/htmlFor).
 *  6. Input password pakai <PasswordInput> (ada tombol tampil/sembunyi).
 *     Checkbox publish/aktif pakai <Toggle> (pembungkus tipis di atas
 *     `Switch` shadcn, bukan `<input type="checkbox">` mentah).
 *  7. Animasi masuk pakai tailwindcss-animate (animate-in fade-in
 *     slide-in-from-bottom-2 duration-500) -- jangan tambah library baru.
 *
 * Kalau mau ubah tampilan SEMUA halaman sekaligus, ubah di file ini.
 */

/** Kelas tombol aksi utama halaman (warna gamify, sama dengan nav aktif). */
export const primaryButtonClass =
  'bg-gamify text-gamify-foreground shadow-sm hover:bg-gamify/90';

/** Kepala halaman: judul + (opsional) jumlah, deskripsi, dan aksi di kanan. */
export function PageHeader({ title, description, count, actions }) {
  return (
    <div className="flex flex-col gap-4 duration-500 animate-in fade-in slide-in-from-bottom-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {count != null && <Badge variant="gamify">{count}</Badge>}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Pembungkus standar untuk tabel/daftar data. */
export function DataCard({ className, children, ...props }) {
  return (
    <div
      {...props}
      className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}
    >
      {children}
    </div>
  );
}

/**
 * Kartu form/pengaturan tunggal: kepala (ikon + judul + deskripsi) di atas,
 * isi form di bawah. Dipakai halaman berbentuk form, mis. Profil,
 * Pengenalan Wabah, Border SEKALA.
 */
export function FormCard({ icon: Icon, title, description, className, children }) {
  return (
    <DataCard className={cn('duration-500 animate-in fade-in slide-in-from-bottom-2', className)}>
      <div className="border-b bg-secondary/40 px-6 py-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gamify/10 text-gamify">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </DataCard>
  );
}

/** Placeholder saat data tabel/daftar sedang dimuat (di atas <Skeleton> shadcn). */
export function TableSkeleton({ rows = 4, className }) {
  return (
    <DataCard className={className}>
      <div className="divide-y" role="status" aria-label="Memuat data">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}

/** Placeholder untuk halaman berbentuk grid kartu (bukan tabel). */
export function CardGridSkeleton({ count = 3, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)} role="status" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}

/** Placeholder untuk halaman berbentuk form singleton (bukan tabel/grid). */
export function FormSkeleton({ className }) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)} role="status" aria-label="Memuat data">
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

/** Tampilan saat daftar kosong. */
export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <DataCard className="border-dashed shadow-none">
      <div className="flex flex-col items-center px-6 py-14 text-center duration-500 animate-in fade-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </DataCard>
  );
}

/** Pesan error (halaman maupun form). Kirim `onRetry` kalau bisa diulang. */
export function InlineError({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm duration-200 animate-in fade-in slide-in-from-top-1"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="h-7 gap-1.5 text-xs">
          <RefreshCw className="h-3 w-3" /> Coba lagi
        </Button>
      )}
    </div>
  );
}

/** Avatar inisial (dipakai di daftar orang: admin, dst). */
export function InitialsAvatar({ name, className }) {
  const text =
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';

  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gamify/15 text-xs font-semibold text-gamify',
        className
      )}
    >
      {text}
    </div>
  );
}

/** Label + kontrol form. `id` WAJIB sama dengan id pada input di dalamnya. */
export function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Input password dengan tombol tampil/sembunyi. Props lain diteruskan ke <Input>. */
export function PasswordInput({ className, ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className={cn('pr-11', className)} />
      {/* type="button" WAJIB -- tanpa ini tombol di dalam <form> ikut men-submit form. */}
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Toggle publish/aktif -- pembungkus tipis di atas `Switch` shadcn (bukan
 * lagi custom button+span buatan sendiri, lihat catatan revisi di atas).
 */
export function Toggle({ checked, onChange, label, hint, id }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      {(label || hint) && (
        <label htmlFor={id} className="cursor-pointer select-none">
          {label && <p className="text-sm font-medium leading-tight">{label}</p>}
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </label>
      )}
    </div>
  );
}