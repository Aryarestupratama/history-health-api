import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarRange, ChevronRight, Landmark, Plus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { getEraAccent } from '@/config/branding';
import {
  CardGridSkeleton,
  EmptyState,
  Field,
  InlineError,
  PageHeader,
  primaryButtonClass,
} from '@/components/page-kit';
import EraQuizManager from '@/pages/EraQuizManager';

/**
 * Entry point Content Studio (Design.md §4.1):
 *   Pilih Era (grid card) -> Pilih Tahun (grid card + quick-create inline)
 *   -> submit tahun baru langsung masuk ke WabahWorkspace tahun tsb.
 *
 * Routing: /studio (step ini) -> /studio/:yearId (WabahWorkspace)
 *
 * REDESIGN (relayout), diselaraskan dengan EraYearManager.jsx:
 *  - Gaya dari `@/components/page-kit` + token semantik (bukan zinc-* mentah).
 *  - Kartu era & tahun: tinggi seragam walau panjang isi beda (judul
 *    dipotong, deskripsi/judul memesan tempat tetap, status menempel di
 *    dasar kartu). Seluruh kartu adalah satu tombol (tidak ada tombol di
 *    dalam tombol).
 *  - Level era: breadcrumb "Semua masa > Nama era" + `Tabs` shadcn
 *    ([Tahun] / [Kuis Sumatif Era]) menggantikan pill geser buatan sendiri
 *    (tanpa semantik tab & navigasi panah keyboard). Tombol "Tambah Tahun"
 *    naik ke header halaman, hanya tampil di tab Tahun.
 *  - Tombol utama pakai `primaryButtonClass`; warna era (`getEraAccent`)
 *    hanya jadi aksen (ikon, titik).
 * PERBAIKAN (di luar tampilan): fetch era/tahun kini punya penanganan error
 * + "Coba lagi" (sebelumnya gagal fetch = layar "Memuat..." selamanya),
 * respons tahun yang basi (ganti era cepat-cepat) diabaikan, `sort` tidak
 * lagi memutasi array respons, dan root tidak lagi punya `p-8` sendiri
 * (Layout sudah memberi padding -> sebelumnya padding dobel).
 * Logic API (GET eras/years, POST years, navigasi ke /studio/:yearId) TIDAK
 * berubah.
 */
export default function StudioEraYearPicker() {
  const navigate = useNavigate();
  const [eras, setEras] = useState(null);
  const [erasError, setErasError] = useState(null);
  const [activeEra, setActiveEra] = useState(null); // era yang lagi di-expand
  const [years, setYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearsError, setYearsError] = useState(null);
  const [showYearForm, setShowYearForm] = useState(false);
  // Tab level Era (BUKAN level Year seperti tab di WabahWorkspace) — "years"
  // = grid Tahun (default), "quiz" = EraQuizManager (kuis sumatif "final
  // boss" era ini, Rules.md R-ERAQUIZ). Direset tiap ganti era (lihat openEra).
  const [eraTab, setEraTab] = useState('years');
  // Penanda permintaan tahun terbaru: respons dari era yang sudah ditinggalkan
  // (ganti era cepat-cepat) diabaikan, supaya tidak menimpa daftar tahun.
  const yearsRequest = useRef(0);

  useEffect(() => {
    fetchEras();
  }, []);

  async function fetchEras() {
    setErasError(null);
    try {
      const { data } = await apiClient.get('/admin/eras');
      setEras(data);
    } catch (err) {
      setErasError('Gagal memuat daftar era.');
    }
  }

  async function loadYears(eraId) {
    const requestId = ++yearsRequest.current;
    setLoadingYears(true);
    setYearsError(null);
    try {
      // TODO verifikasi: asumsi endpoint mendukung filter `?era_id=`, konsisten
      // dengan pola filter di AdminSectionController (`?year_id=`).
      const { data } = await apiClient.get('/admin/years', { params: { era_id: eraId } });
      if (requestId !== yearsRequest.current) return;
      setYears([...data].sort((a, b) => a.year - b.year));
    } catch (err) {
      if (requestId !== yearsRequest.current) return;
      setYearsError('Gagal memuat daftar tahun.');
    } finally {
      if (requestId === yearsRequest.current) setLoadingYears(false);
    }
  }

  function openEra(era) {
    setActiveEra(era);
    setEraTab('years');
    setYears([]);
    loadYears(era.id);
  }

  function backToEraGrid() {
    yearsRequest.current += 1; // batalkan respons yang masih di jalan
    setActiveEra(null);
    setYears([]);
    setYearsError(null);
    setShowYearForm(false);
  }

  async function createYear({ year, title }) {
    const { data: newYear } = await apiClient.post('/admin/years', {
      era_id: activeEra.id,
      year,
      title,
    });
    toast.success(`Tahun "${newYear.year} — ${newYear.title}" berhasil dibuat`);
    // submit langsung masuk ke Workspace Wabah tahun baru tsb (Design.md §4.1)
    navigate(`/studio/${newYear.id}`);
  }

  const accent = activeEra ? getEraAccent(activeEra.slug).hex : null;
  const showAddButton = !!activeEra && eraTab === 'years';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Studio"
        count={activeEra && eraTab === 'years' && !loadingYears && !yearsError ? years.length : null}
        description={
          activeEra
            ? `Pilih atau buat tahun di ${activeEra.name} untuk mulai mengisi konten wabah.`
            : 'Pilih masa untuk melihat tahun-tahun di dalamnya.'
        }
        actions={
          showAddButton && (
            <Button onClick={() => setShowYearForm(true)} className={primaryButtonClass}>
              <Plus className="h-4 w-4" /> Tambah Tahun
            </Button>
          )
        }
      />

      {!activeEra ? (
        erasError ? (
          <InlineError message={erasError} onRetry={fetchEras} />
        ) : !eras ? (
          <CardGridSkeleton count={3} />
        ) : eras.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Belum ada era"
            description="Data era belum tersedia dari server."
          />
        ) : (
          <EraGrid eras={eras} onSelect={openEra} />
        )
      ) : (
        <div className="space-y-5 duration-500 animate-in fade-in">
          <nav aria-label="Navigasi era" className="flex items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={backToEraGrid}
              className="rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Semua masa
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
            <span aria-current="page" className="flex items-center gap-2 font-medium">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              {activeEra.name}
            </span>
          </nav>

          {/* Tab level Era (Design.md, revisi Content Studio): "Tahun" = grid
              tahun, "Kuis Sumatif Era" = EraQuizManager, dikelola sebagai
              tab di sini (bukan halaman terpisah) supaya admin tidak perlu
              keluar dari Content Studio. Konten tab non-aktif tidak
              di-mount (perilaku bawaan Radix Tabs). */}
          <Tabs value={eraTab} onValueChange={setEraTab}>
            <TabsList>
              <TabsTrigger value="years">Tahun</TabsTrigger>
              <TabsTrigger value="quiz">Kuis Sumatif Era</TabsTrigger>
            </TabsList>

            <TabsContent value="years" className="mt-5">
              {loadingYears ? (
                <CardGridSkeleton count={4} className="lg:grid-cols-3 xl:grid-cols-4" />
              ) : yearsError ? (
                <InlineError message={yearsError} onRetry={() => loadYears(activeEra.id)} />
              ) : years.length === 0 ? (
                <EmptyState
                  icon={CalendarRange}
                  title="Belum ada tahun di era ini"
                  description="Tambahkan tahun wabah pertama untuk mulai mengisi konten era ini."
                  action={
                    <Button onClick={() => setShowYearForm(true)} className={primaryButtonClass}>
                      <Plus className="h-4 w-4" /> Tambah Tahun
                    </Button>
                  }
                />
              ) : (
                <YearGrid years={years} accent={accent} onSelect={(y) => navigate(`/studio/${y.id}`)} />
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-5">
              <EraQuizManager era={activeEra} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {activeEra && (
        <YearDialog
          open={showYearForm}
          onClose={() => setShowYearForm(false)}
          era={activeEra}
          accent={accent}
          years={years}
          onCreate={createYear}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Era grid */

function EraGrid({ eras, onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-4 duration-500 animate-in fade-in sm:grid-cols-2 lg:grid-cols-3">
      {eras.map((era) => {
        const accent = getEraAccent(era.slug).hex;
        return (
          <button
            key={era.id}
            type="button"
            onClick={() => onSelect(era)}
            className="group flex h-full flex-col rounded-2xl border bg-card p-5 text-left shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
              aria-hidden="true"
            >
              <Landmark className="h-5 w-5" />
            </div>

            {/* Ukuran isi dibuat tetap supaya semua kartu identik walau
                panjang teksnya beda: judul 1 baris (dipotong, lengkapnya di
                tooltip), deskripsi selalu memesan tempat 2 baris. */}
            <div className="mb-5 mt-4 min-w-0">
              <h3 className="truncate text-xl font-semibold leading-7 tracking-tight" title={era.name}>
                {era.name}
              </h3>
              <p
                className={
                  era.description
                    ? 'mt-1.5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground'
                    : 'mt-1.5 min-h-10 text-sm italic leading-5 text-muted-foreground/60'
                }
              >
                {era.description || 'Belum ada deskripsi.'}
              </p>
            </div>

            {/* mt-auto: footer selalu menempel di dasar kartu. */}
            <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4 text-sm text-muted-foreground">
              <span>{era.years_count ?? '\u2014'} tahun</span>
              <ChevronRight
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Year grid */

function YearGrid({ years, accent, onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-4 duration-500 animate-in fade-in sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {years.map((y) => (
        <button
          key={y.id}
          type="button"
          onClick={() => onSelect(y)}
          className="group flex h-full flex-col rounded-2xl border bg-card p-5 text-left shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              {y.year}
            </span>
            <ChevronRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>

          {/* min-h-12 = tempat 2 baris: judul 1 baris tidak membuat kartu
              lebih pendek dari yang 2 baris. */}
          <span className="mt-2 line-clamp-2 min-h-12 text-lg font-semibold leading-6" title={y.title}>
            {y.title}
          </span>

          {/* Status menempel di dasar kartu; tinggi baris dipesan walau kosong. */}
          <div className="mt-auto flex min-h-[1.375rem] flex-wrap gap-1.5 pt-4">
            {y.quiz?.is_published && <Badge variant="success">Kuis siap</Badge>}
            {!y.summary && <Badge variant="secondary">Rangkuman kosong</Badge>}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------- Dialog tahun baru (cepat) */

function YearDialog({ open, onClose, era, accent, years, onCreate }) {
  const [form, setForm] = useState({ year: '', title: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form bersih setiap dialog dibuka.
  useEffect(() => {
    if (open) {
      setForm({ year: '', title: '' });
      setFormError(null);
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    if (!form.year || !form.title) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate({ year: Number(form.year), title: form.title });
      // navigate ke workspace terjadi di onCreate (induk) — dialog tidak
      // perlu ditutup manual karena komponen ini akan unmount begitu route
      // berpindah.
    } catch (err) {
      setFormError(err?.response?.data?.message ?? 'Gagal membuat tahun baru');
      setSubmitting(false);
    }
  }

  const yearAlreadyExists = form.year !== '' && years.some((y) => y.year === Number(form.year));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            <CalendarRange className="h-5 w-5" />
          </div>
          <DialogTitle>Tahun baru</DialogTitle>
          <DialogDescription>
            Tahun wabah dalam {era.name}. Setelah dibuat, Workspace Wabah tahun ini langsung terbuka.
          </DialogDescription>
        </DialogHeader>

        {formError && <InlineError message={formError} />}

        <form id="quick-create-year-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4">
            <Field id="quick-year-number" label="Tahun">
              <Input
                id="quick-year-number"
                type="number"
                placeholder="1918"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="tabular-nums"
                autoFocus
                required
              />
            </Field>
            <Field id="quick-year-title" label="Judul wabah">
              <Input
                id="quick-year-title"
                placeholder="mis. Wabah Flu Spanyol"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
          </div>
          {yearAlreadyExists && (
            <p role="status" className="flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Tahun ini sudah ada di era ini
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button
            type="submit"
            form="quick-create-year-form"
            className={primaryButtonClass}
            disabled={submitting}
          >
            {submitting ? 'Membuat...' : 'Buat & Buka'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}