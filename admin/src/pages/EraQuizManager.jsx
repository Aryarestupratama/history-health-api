import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ListChecks,
  Shuffle,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { getEraAccent } from '@/config/branding';
import { DataCard, EmptyState, InlineError, primaryButtonClass } from '@/components/page-kit';

/**
 * <EraQuizManager era={{ id, name, slug }} />
 *
 * Kuis sumatif era TIDAK punya bank soal sendiri: soal ditarik OTOMATIS dari
 * kuis FORMATIF (quiz_questions) tiap year dalam era ini, didistribusikan 20
 * soal total secara proporsional (Rules.md R-ERAQUIZ,
 * EraQuiz::randomQuestions()). Komponen ini tidak mengedit soal; tugasnya:
 * memberi tahu admin SEJAUH MANA era ini siap, apa yang masih kurang, dan
 * menjadi tempat Publish/Unpublish.
 *
 * REDESIGN (relayout total). Alur baca dari atas ke bawah mengikuti
 * pertanyaan admin:
 *  1. "Sudah siap dipublish?"  -> kartu KESIAPAN: kalimat status, bar
 *     segmen (1 segmen = 1 tahun, terisi warna era kalau kuis formatifnya
 *     published), dan tombol Publish/Unpublish di sebelahnya. Tombol aksi
 *     ada di tempat status dibaca, bukan di pojok header. Kalau tombol
 *     nonaktif, alasannya tertulis di bawahnya (bukan sekadar abu-abu).
 *  2. "Tahun mana yang kurang?" -> tabel per tahun dengan 3 tingkat status
 *     (Published / Belum dipublish / Soal belum lengkap), bar kelengkapan
 *     soal x/15, kuota sumatif, dan tombol "Lengkapi"/"Buka" yang langsung
 *     menuju Workspace tahun itu (dulu admin harus cari sendiri).
 *  3. Panel samping (sticky): aturan kuis dan DISTRIBUSI SOAL per tahun
 *     (batang proporsional, muncul begitu semua tahun siap).
 * Komponen ini dipasang di dalam tab "Kuis Sumatif Era" (StudioEraYearPicker
 * yang sudah punya <PageHeader>/h1), jadi di sini hanya ada h2.
 *
 * Perilaku baru yang disengaja: Unpublish kini minta konfirmasi (kuis yang
 * sedang tayang ke user), memakai `useConfirm` seperti hapus di halaman lain.
 * Perbaikan lama tetap: fetch gagal punya <InlineError> + "Coba lagi",
 * respons era yang sudah ditinggalkan diabaikan.
 * Logic API (GET /admin/eras/:id/quiz, PATCH /admin/era-quizzes/:id/publish)
 * TIDAK berubah. Tidak ada komponen shadcn baru yang dibutuhkan: bar
 * kelengkapan sengaja div sederhana ber-`role="progressbar"`.
 */

// Harus sama dengan Quiz::QUESTION_COUNT di backend.
const FORMATIVE_QUESTION_COUNT = 15;

/** Tingkat status satu tahun untuk lencana di tabel. */
function yearStatus(y) {
  if (y.quiz_published) return { variant: 'success', label: 'Published' };
  if (y.quiz_question_count >= FORMATIVE_QUESTION_COUNT) {
    return { variant: 'info', label: 'Belum dipublish' };
  }
  return { variant: 'warning', label: 'Soal belum lengkap' };
}

export default function EraQuizManager({ era }) {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  // { id, is_published, can_publish, attempt_question_count, years: [...] }
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  // Penanda permintaan terbaru: respons era yang sudah ditinggalkan diabaikan.
  const request = useRef(0);

  const accent = getEraAccent(era?.slug).hex;

  useEffect(() => {
    if (!era) return;
    setData(null);
    setPublishError(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [era?.id]);

  async function load() {
    const requestId = ++request.current;
    setLoadError(null);
    try {
      const { data: res } = await apiClient.get(`/admin/eras/${era.id}/quiz`);
      if (requestId !== request.current) return;
      setData(res);
    } catch (err) {
      if (requestId !== request.current) return;
      setLoadError('Gagal memuat status kuis sumatif era.');
    }
  }

  async function togglePublish() {
    if (data.is_published) {
      const ok = await confirm({
        title: 'Unpublish kuis sumatif era?',
        description:
          'Kuis ini tidak akan tampil lagi ke user sampai dipublish ulang. Skor yang sudah tersimpan tidak dihapus.',
      });
      if (!ok) return;
    }

    setPublishing(true);
    setPublishError(null);
    try {
      const { data: updated } = await apiClient.patch(`/admin/era-quizzes/${data.id}/publish`, {
        is_published: !data.is_published,
      });
      setData((prev) => ({ ...prev, ...updated }));
      toast.success(updated.is_published ? 'Kuis sumatif era dipublish' : 'Kuis sumatif era di-unpublish');
      load(); // refresh breakdown per year (kuota berubah begitu status publish berubah)
    } catch (err) {
      setPublishError(
        err?.response?.data?.message ??
          `Gagal publish. Semua tahun di era ini harus sudah punya kuis formatif ${FORMATIVE_QUESTION_COUNT} soal yang dipublish.`
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loadError && !data) {
    return <InlineError message={loadError} onRetry={load} />;
  }

  if (!data) {
    return <QuizManagerSkeleton />;
  }

  const years = data.years ?? [];
  const readyCount = years.filter((y) => y.quiz_published).length;
  const missingCount = years.length - readyCount;

  return (
    <div className="space-y-6 duration-500 animate-in fade-in">
      {dialog}

      {/* Kepala seksi */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-tight">Kuis Sumatif {era?.name}</h2>
          {data.is_published ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Kuis penutup era. Soalnya tidak diisi di sini: ditarik otomatis dari kuis formatif tiap
          tahun, jadi tugas Anda memastikan semua tahun sudah siap.
        </p>
      </div>

      {years.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Belum ada tahun di era ini"
          description="Kuis sumatif menarik soal dari tahun-tahun di era ini. Tambahkan tahun di tab Tahun dulu."
        />
      ) : (
        <>
          <ReadinessCard
            data={data}
            years={years}
            readyCount={readyCount}
            missingCount={missingCount}
            accent={accent}
            publishing={publishing}
            onToggle={togglePublish}
          />

          {publishError && <InlineError message={publishError} />}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <YearTable years={years} onOpenYear={(y) => navigate(`/studio/${y.id}`)} />

            <aside className="space-y-4 lg:sticky lg:top-6">
              <DistributionCard years={years} total={data.attempt_question_count} accent={accent} />
              <RulesCard data={data} accent={accent} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Kartu kesiapan */

function ReadinessCard({ data, years, readyCount, missingCount, accent, publishing, onToggle }) {
  const live = data.is_published;
  const ready = data.can_publish;

  let tone = 'warning';
  let headline = 'Belum bisa dipublish';
  let sub = `Kuis sumatif menarik soal dari kuis formatif tiap tahun, jadi semua tahun harus siap dulu. Tinggal ${missingCount} tahun lagi.`;
  if (live) {
    tone = 'success';
    headline = 'Kuis sumatif sedang tayang';
    sub = 'User yang menyelesaikan era ini bisa mengerjakannya. Unpublish kalau soal formatif perlu diubah.';
  } else if (ready) {
    tone = 'success';
    headline = 'Semua tahun siap, kuis bisa dipublish';
    sub = 'Cek distribusi soal di panel samping, lalu publish kalau sudah sesuai.';
  }

  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;
  const disabled = publishing || (!live && !ready);

  return (
    <DataCard>
      <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-start gap-3.5">
            <span
              className={
                tone === 'success'
                  ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning'
              }
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight">{headline}</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{sub}</p>
            </div>
          </div>

          <SegmentBar years={years} readyCount={readyCount} accent={accent} />
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 md:w-48 md:items-end">
          <Button
            onClick={onToggle}
            disabled={disabled}
            variant={live ? 'outline' : 'default'}
            className={live ? 'w-full md:w-auto' : `w-full md:w-auto ${primaryButtonClass}`}
          >
            {publishing ? 'Menyimpan...' : live ? 'Unpublish' : 'Publish kuis sumatif'}
          </Button>
          {!live && !ready && (
            <p className="text-xs text-muted-foreground md:text-right" aria-live="polite">
              Lengkapi {missingCount} tahun dulu untuk membuka tombol ini.
            </p>
          )}
        </div>
      </div>
    </DataCard>
  );
}

/** Bar segmen: 1 segmen = 1 tahun, terisi warna era kalau kuis formatifnya published. */
function SegmentBar({ years, readyCount, accent }) {
  return (
    <div>
      <div
        role="progressbar"
        aria-label="Tahun dengan kuis formatif published"
        aria-valuemin={0}
        aria-valuemax={years.length}
        aria-valuenow={readyCount}
        className="flex gap-1.5"
      >
        {years.map((y) => (
          <span
            key={y.id}
            title={`${y.year}: ${y.quiz_published ? 'siap' : 'belum siap'}`}
            className="h-2 flex-1 rounded-full bg-secondary transition-colors duration-500 motion-reduce:transition-none"
            style={y.quiz_published ? { backgroundColor: accent } : undefined}
          />
        ))}
      </div>
      <p className="mt-2 text-xs tabular-nums text-muted-foreground">
        {readyCount} dari {years.length} tahun siap
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Tabel tahun */

function YearTable({ years, onOpenYear }) {
  return (
    <DataCard>
      <div className="border-b bg-secondary/40 px-5 py-3.5">
        <h3 className="text-sm font-semibold">Kuis formatif per tahun</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tiap tahun butuh {FORMATIVE_QUESTION_COUNT} soal dan sudah dipublish.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Tahun</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="min-w-36">Kelengkapan soal</TableHead>
            <TableHead className="text-right">Kuota</TableHead>
            <TableHead className="w-28 text-right">
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {years.map((y) => {
            const status = yearStatus(y);
            const pct = Math.min(100, Math.round((y.quiz_question_count / FORMATIVE_QUESTION_COUNT) * 100));
            return (
              <TableRow key={y.id}>
                <TableCell>
                  <p className="font-medium tabular-nums leading-tight">{y.year}</p>
                  <p className="mt-0.5 max-w-52 truncate text-xs text-muted-foreground" title={y.title}>
                    {y.title}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      role="progressbar"
                      aria-label={`Soal kuis formatif ${y.year}`}
                      aria-valuemin={0}
                      aria-valuemax={FORMATIVE_QUESTION_COUNT}
                      aria-valuenow={y.quiz_question_count}
                      className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary"
                    >
                      <div
                        className={
                          pct >= 100
                            ? 'h-full rounded-full bg-success transition-all duration-500 motion-reduce:transition-none'
                            : 'h-full rounded-full bg-warning transition-all duration-500 motion-reduce:transition-none'
                        }
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {y.quiz_question_count}/{FORMATIVE_QUESTION_COUNT}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {y.quota_if_published !== null ? `${y.quota_if_published} soal` : '\u2014'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={y.quiz_published ? 'ghost' : 'outline'}
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => onOpenYear(y)}
                    aria-label={`${y.quiz_published ? 'Buka' : 'Lengkapi'} kuis tahun ${y.year}`}
                  >
                    {y.quiz_published ? 'Buka' : 'Lengkapi'}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataCard>
  );
}

/* ------------------------------------------------------------ Panel samping */

/** Distribusi 20 soal per tahun: batang proporsional, aktif setelah semua tahun siap. */
function DistributionCard({ years, total, accent }) {
  const rows = years.filter((y) => y.quota_if_published !== null);
  const sum = rows.reduce((acc, y) => acc + y.quota_if_published, 0);

  return (
    <DataCard>
      <div className="p-4">
        <h3 className="text-sm font-semibold">Distribusi soal</h3>
        {rows.length === 0 ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Pembagian {total} soal per tahun muncul di sini begitu semua tahun siap.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {total} soal per percobaan, dibagi proporsional dan diacak ulang tiap percobaan.
            </p>
            <ul className="mt-4 space-y-3">
              {rows.map((y) => (
                <li key={y.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium tabular-nums">{y.year}</span>
                    <span className="tabular-nums text-muted-foreground">{y.quota_if_published} soal</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <div
                      className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                      style={{
                        width: `${sum ? (y.quota_if_published / sum) * 100 : 0}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </DataCard>
  );
}

/** Aturan tetap kuis sumatif (hanya baca). */
function RulesCard({ data, accent }) {
  const rules = [
    { icon: Shuffle, label: 'Sumber soal', value: 'Kuis formatif tiap tahun' },
    { icon: ListChecks, label: 'Jumlah soal', value: `${data.attempt_question_count} per percobaan` },
    { icon: Target, label: 'Passing grade', value: '75%, tetap' },
  ];

  return (
    <DataCard>
      <ul className="divide-y">
        {rules.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-center gap-3 px-4 py-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium leading-tight">{value}</p>
            </div>
          </li>
        ))}
      </ul>
    </DataCard>
  );
}

/* ----------------------------------------------------------------- Skeleton */

/** Kerangka pemuatan yang meniru layout asli (bukan tabel generik). */
function QuizManagerSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat status kuis sumatif">
      <div className="space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Skeleton className="h-64 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}