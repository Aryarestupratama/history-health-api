import { useEffect, useState } from 'react';
import { AlertTriangle, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhonePreview from '../components/PhonePreview';
import {
  Field,
  FormCard,
  FormSkeleton,
  InlineError,
  PageHeader,
  Toggle,
  primaryButtonClass,
} from '@/components/page-kit';

// Aset Border SEKALA — singleton, pola sama WabahIntroManager (tidak ada
// list/table/dialog tambah-baru, cuma 1 form yang selalu ada, sesuai
// SekalaBorderController backend yang cuma punya show()/update()).
// Field-nya `image_link` (link Drive mentah): border berupa gambar yang
// dipasang melingkari foto profil user, bukan konten bacaan.
//
// REDESIGN (relayout): form di kiri, pratinjau HP di kanan (sticky di layar
// lebar). Tambahan UX:
//  - lencana status di header (Published / Draft) dari data TERSIMPAN,
//  - deteksi perubahan belum tersimpan (tombol Simpan nonaktif kalau tidak
//    ada perubahan, tombol Kembalikan, penanda "belum disimpan", dan
//    peringatan bawaan browser kalau tab ditutup saat ada perubahan),
//  - spesifikasi aset di dekat kolom link,
//  - peringatan kalau di-publish tanpa link (user akan melihat border
//    bawaan/gradient di Flutter).
// Logic API (GET/PUT /admin/sekala-border) TIDAK berubah.
//
// PERBAIKAN: sebelumnya kalau fetch awal gagal, form tetap tampil dengan
// isian KOSONG -- menekan Simpan saat itu akan menimpa data asli di server
// dengan kosong. Sekarang form hanya tampil kalau data berhasil dimuat;
// kalau gagal, cukup pesan error + tombol "Coba lagi".
const EMPTY_FORM = { image_link: '', is_published: false };

function toForm(data) {
  return {
    image_link: data?.image_link || '',
    is_published: !!data?.is_published,
  };
}

/** Catatan peringatan kecil (bukan error): pakai token warning proyek. */
function WarningNote({ children }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-foreground/80">{children}</p>
    </div>
  );
}

export default function SekalaBorderManager() {
  const [form, setForm] = useState(EMPTY_FORM);
  // Snapshot data yang tersimpan di server. `null` = belum berhasil dimuat.
  const [saved, setSaved] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetchBorder();
  }, []);

  async function fetchBorder() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/admin/sekala-border');
      const next = toForm(res.data);
      setForm(next);
      setSaved(next);
      setImageUrl(res.data.image_url || null);
    } catch (err) {
      setLoadError('Gagal memuat aset Border SEKALA.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const res = await api.put('/admin/sekala-border', {
        image_link: form.image_link.trim() || null,
        is_published: form.is_published,
      });
      const next = toForm(res.data);
      setForm(next);
      setSaved(next);
      setImageUrl(res.data.image_url || null);
      toast.success('Border SEKALA berhasil disimpan');
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Gagal menyimpan Border SEKALA.');
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    if (!saved) return;
    setForm(saved);
    setSaveError(null);
  }

  const linkChanged = saved ? form.image_link.trim() !== saved.image_link : false;
  const isDirty = saved
    ? linkChanged || form.is_published !== saved.is_published
    : false;

  // Peringatan bawaan browser kalau tab/jendela ditutup saat ada perubahan
  // yang belum disimpan (navigasi antar-menu di dalam app tidak tercakup).
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const publishWithoutLink = form.is_published && !form.image_link.trim();

  const statusBadge = saved ? (
    saved.is_published ? (
      <Badge variant="success">Published</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    )
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Border SEKALA"
        description="Aset gambar border untuk foto profil user. Hanya ada satu border untuk seluruh aplikasi. Kapan border terbuka untuk user diatur otomatis oleh sistem, halaman ini hanya mengurus gambarnya."
        actions={statusBadge}
      />

      {loading ? (
        <FormSkeleton className="w-full max-w-2xl" />
      ) : !saved ? (
        <InlineError message={loadError} onRetry={fetchBorder} />
      ) : (
        <div className="grid items-start gap-8 duration-500 animate-in fade-in lg:grid-cols-[minmax(0,42rem)_auto] lg:gap-12">
          {/* ---------------------------------------------------------- Form */}
          <FormCard
            icon={ImageIcon}
            title="Aset border"
            description="Tempel link Drive gambar border, lalu publish kalau sudah siap tayang."
          >
            <form id="sekala-border-form" onSubmit={handleSubmit} className="space-y-5">
              {saveError && <InlineError message={saveError} />}

              <div className="space-y-3">
                <Field
                  id="border-image-link"
                  label="Link Google Drive gambar border"
                  hint='Gunakan link "Share" Google Drive, sama seperti link foto vaksin/infografis lain.'
                >
                  <Input
                    id="border-image-link"
                    value={form.image_link}
                    onChange={(e) => setForm({ ...form, image_link: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>

                <div className="rounded-lg border bg-secondary/30 p-3.5">
                  <p className="mb-2 text-xs font-medium">Spesifikasi gambar</p>
                  <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground marker:text-muted-foreground/50">
                    <li>PNG dengan latar transparan.</li>
                    <li>Bentuk persegi, bagian tengah dikosongkan agar foto profil tetap terlihat.</li>
                    <li>
                      Kalau link belum diisi atau gambar gagal dimuat, user melihat border
                      bawaan (gradient).
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-secondary/30 p-3.5">
                  <Toggle
                    id="border-published"
                    checked={form.is_published}
                    onChange={(v) => setForm({ ...form, is_published: v })}
                    label="Publish (tampil ke user)"
                    hint="Kalau belum diaktifkan, user yang sudah membuka border pun tidak melihat gambar ini di aplikasi. Aman untuk menyiapkan asetnya dulu sebelum tayang."
                  />
                </div>

                {publishWithoutLink && (
                  <WarningNote>
                    Publish aktif tapi link gambar masih kosong. User akan melihat border bawaan
                    (gradient), bukan aset dari tim desain.
                  </WarningNote>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {isDirty && (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                      Ada perubahan yang belum disimpan
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 sm:justify-end">
                  {isDirty && !saving && (
                    <Button type="button" variant="ghost" onClick={handleRevert}>
                      Kembalikan
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className={primaryButtonClass}
                    disabled={saving || !isDirty}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </div>
            </form>
          </FormCard>

          {/* ------------------------------------------------------ Pratinjau */}
          <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6">
            <PhonePreview screen="sekala-border" data={{ imageUrl }} compact />
            <p className="max-w-[16rem] text-center text-xs text-muted-foreground" aria-live="polite">
              {linkChanged
                ? 'Link sudah diubah. Pratinjau masih menampilkan versi tersimpan, simpan untuk memperbaruinya.'
                : 'Pratinjau border yang melingkari foto profil.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}