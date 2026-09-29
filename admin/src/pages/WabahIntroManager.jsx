import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, List, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

// Konten singleton "Apa itu Wabah" — beda dari VaccineManager (tidak ada
// list/table/dialog tambah-baru, cuma 1 form yang selalu ada, sesuai
// WabahIntroController backend yang cuma punya show()/update()).
//
// REDESIGN (relayout): form di kiri, pratinjau HP di kanan (sticky di layar
// lebar), pola sama dengan SekalaBorderManager. Tambahan UX khusus halaman
// teks ini:
//  - tombol format List/Bernomor di atas kolom teks (admin tidak perlu hafal
//    sintaks "- " / "1."), memakai aturan parse yang sama dengan
//    RichBodyText di Flutter & PhonePreview,
//  - pratinjau LANGSUNG dari isian (bukan dari data tersimpan),
//  - jumlah kata, deteksi perubahan belum tersimpan (+ Kembalikan, peringatan
//    tutup tab), lencana status, dan peringatan publish tanpa isi.
// Logic API (GET/PUT /admin/wabah-intro) TIDAK berubah.
//
// PERBAIKAN: sebelumnya kalau fetch awal gagal, form tetap tampil KOSONG --
// menekan Simpan saat itu menimpa konten asli di server dengan kosong.
// Sekarang form hanya tampil kalau data berhasil dimuat.
const EMPTY_FORM = { content: '', is_published: false };
const TEXTAREA_ID = 'wabah-intro-content';

function toForm(data) {
  return {
    content: data?.content || '',
    is_published: !!data?.is_published,
  };
}

/**
 * Ubah baris-baris yang terseleksi menjadi list (atau lepas kembali kalau
 * semuanya sudah berformat itu). Aturan penanda HARUS sama dengan
 * RichBodyText (Flutter) & parseRichBody (PhonePreview): bullet `- `,
 * bernomor `1.` (1-2 digit).
 */
function toggleList(text, start, end, kind) {
  const bulletRe = /^\s*[-*•]\s+/;
  const orderedRe = /^\s*\d{1,2}[.)]\s+/;
  const anyRe = /^\s*(?:[-*•]|\d{1,2}[.)])\s+/;

  // Kalau seleksi berakhir persis di awal baris baru, baris itu tidak ikut.
  const effEnd = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const lineStart = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', effEnd);
  if (lineEnd === -1) lineEnd = text.length;

  const lines = text.slice(lineStart, lineEnd).split('\n');
  const marker = (n) => (kind === 'bullet' ? '- ' : `${n}. `);
  const isKind = (l) => (kind === 'bullet' ? bulletRe : orderedRe).test(l);
  const filled = lines.filter((l) => l.trim());

  let next;
  if (filled.length === 0) {
    // Baris kosong: sisipkan penanda pertama supaya admin tinggal mengetik.
    next = lines.map((l, i) => (i === 0 ? marker(1) : l));
  } else if (filled.every(isKind)) {
    // Semua sudah berformat ini -> lepas (toggle off).
    next = lines.map((l) => l.replace(anyRe, ''));
  } else {
    let n = 0;
    next = lines.map((l) => (l.trim() ? marker(++n) + l.replace(anyRe, '') : l));
  }

  const block = next.join('\n');
  const newText = text.slice(0, lineStart) + block + text.slice(lineEnd);
  const selEnd = lineStart + block.length;
  return { text: newText, selStart: start === end ? selEnd : lineStart, selEnd };
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

export default function WabahIntroManager() {
  const [form, setForm] = useState(EMPTY_FORM);
  // Snapshot data yang tersimpan di server. `null` = belum berhasil dimuat.
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetchIntro();
  }, []);

  async function fetchIntro() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/admin/wabah-intro');
      const next = toForm(res.data);
      setForm(next);
      setSaved(next);
    } catch (err) {
      setLoadError('Gagal memuat konten pengenalan wabah.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const res = await api.put('/admin/wabah-intro', {
        content: form.content.trim() || null,
        is_published: form.is_published,
      });
      const next = toForm(res.data);
      setForm(next);
      setSaved(next);
      toast.success('Konten berhasil disimpan');
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Gagal menyimpan konten pengenalan wabah.');
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    if (!saved) return;
    setForm(saved);
    setSaveError(null);
  }

  // Tombol format list: baca seleksi langsung dari elemen textarea (lewat id,
  // supaya tidak bergantung pada forwardRef komponen Textarea).
  function applyList(kind) {
    const el = document.getElementById(TEXTAREA_ID);
    if (!el) return;
    const result = toggleList(form.content, el.selectionStart, el.selectionEnd, kind);
    setForm({ ...form, content: result.text });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  const isDirty = saved
    ? form.content !== saved.content || form.is_published !== saved.is_published
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

  const trimmed = form.content.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const publishWithoutContent = form.is_published && !trimmed;

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
        title="Pengenalan Wabah"
        description={'Teks penjelasan "Apa itu Wabah" yang muncul saat user mengetuk ikon info di header roadmap era. Hanya ada satu konten untuk seluruh aplikasi.'}
        actions={statusBadge}
      />

      {loading ? (
        <FormSkeleton className="w-full max-w-2xl" />
      ) : !saved ? (
        <InlineError message={loadError} onRetry={fetchIntro} />
      ) : (
        <div className="grid items-start gap-8 duration-500 animate-in fade-in lg:grid-cols-[minmax(0,42rem)_auto] lg:gap-12">
          {/* ---------------------------------------------------------- Form */}
          <FormCard
            icon={FileText}
            title="Isi konten"
            description="Tulis penjelasan singkat, lalu publish kalau sudah siap tayang."
          >
            <form id="wabah-intro-form" onSubmit={handleSubmit} className="space-y-5">
              {saveError && <InlineError message={saveError} />}

              <Field id={TEXTAREA_ID} label={'Teks penjelasan "Apa itu Wabah"'}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Format teks">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => applyList('bullet')}
                    >
                      <List className="h-3.5 w-3.5" aria-hidden="true" /> List
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => applyList('ordered')}
                    >
                      <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> Bernomor
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">
                      Pilih baris lalu klik, klik lagi untuk melepas.
                    </span>
                  </div>

                  <Textarea
                    id={TEXTAREA_ID}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Tuliskan penjelasan tentang apa itu wabah..."
                    rows={12}
                    className="resize-y leading-relaxed"
                  />

                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <p>
                      Baris kosong memisahkan paragraf. Bold dan italic belum didukung.
                    </p>
                    <p className="tabular-nums" aria-live="polite">
                      {wordCount} kata
                    </p>
                  </div>
                </div>
              </Field>

              <div className="space-y-3">
                <div className="rounded-lg border bg-secondary/30 p-3.5">
                  <Toggle
                    id="wabah-intro-published"
                    checked={form.is_published}
                    onChange={(v) => setForm({ ...form, is_published: v })}
                    label="Publish (tampil ke user)"
                    hint="Kalau belum diaktifkan, user tidak akan melihat konten ini sama sekali. Aman untuk menyiapkan teksnya dulu sebelum tayang."
                  />
                </div>

                {publishWithoutContent && (
                  <WarningNote>
                    Publish aktif tapi teks masih kosong. User akan membuka modal yang tidak
                    berisi penjelasan apa pun.
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
          {/* Render `content` lewat RichBodyText (paragraf + list), sama
              dengan di Flutter. Live dari isian, bukan dari data tersimpan. */}
          <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6">
            <PhonePreview screen="wabah-intro" data={{ content: form.content }} compact />
            <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
              Pratinjau langsung, berubah saat Anda mengetik. Di aplikasi, konten tampil sebagai
              bottom sheet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}