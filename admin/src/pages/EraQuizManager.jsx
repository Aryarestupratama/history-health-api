import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ListChecks, Shuffle, Target } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ERA_ACCENTS } from "@/config/branding";

/**
 * <EraQuizManager era={{ id, name, slug }} />
 *
 * REVISI TOTAL: kuis sumatif era TIDAK LAGI punya bank soal sendiri untuk
 * dikelola admin di sini — soal ditarik OTOMATIS dari kuis FORMATIF
 * (quiz_questions) milik tiap year dalam era ini, didistribusikan 20 soal
 * total secara proporsional (Rules.md R-ERAQUIZ, EraQuiz::randomQuestions()).
 *
 * Komponen ini sekarang HANYA:
 * 1. Menampilkan status kuis formatif tiap year (published/belum + jumlah
 *    soal) — supaya admin tahu apa yang masih kurang sebelum bisa publish.
 * 2. Menampilkan kuota soal per year SAAT SEMUA sudah published (preview
 *    distribusi 20 soal, mis. 3 year -> 7/7/6).
 * 3. Tombol toggle publish kuis sumatif — TIDAK ADA lagi editor soal,
 *    tambah/hapus soal, atau preview HP di sini. Admin isi soal lewat tab
 *    Kuis di WabahWorkspace (per year), bukan di komponen ini.
 *
 * Styling disamakan dengan pola halaman admin lain (mis. AdminManager.jsx):
 * header judul+deskripsi+aksi di kanan, tabel dibungkus card
 * `rounded-lg border border-l-4`, hanya warna aksen kiri yang mengikuti
 * warna era (bukan warna fix seperti `gamify`) supaya tetap terasa "punya
 * identitas era" sesuai Design.md §5.4.
 */
export default function EraQuizManager({ era }) {
  const [data, setData] = useState(null); // { id, is_published, can_publish, attempt_question_count, years: [...] }
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const accent = ERA_ACCENTS?.[era?.slug]?.hex ?? "#0C0C0C";

  useEffect(() => {
    if (!era) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [era?.id]);

  function load() {
    apiClient.get(`/admin/eras/${era.id}/quiz`).then(({ data }) => setData(data));
  }

  async function togglePublish() {
    setPublishing(true);
    setError(null);
    try {
      const { data: updated } = await apiClient.patch(`/admin/era-quizzes/${data.id}/publish`, {
        is_published: !data.is_published,
      });
      setData((prev) => ({ ...prev, ...updated }));
      toast.success(updated.is_published ? "Kuis sumatif era dipublish" : "Kuis sumatif era di-unpublish");
      load(); // refresh breakdown per year (quota berubah begitu status publish berubah)
    } catch (e) {
      const message =
        e?.response?.data?.message ??
        "Gagal publish (butuh SEMUA tahun di era ini sudah punya kuis formatif 10 soal yang dipublish).";
      setError(message);
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-zinc-400">Memuat status kuis sumatif…</p>;
  }

  const readyYearsCount = data.years.filter((y) => y.quiz_published).length;

  return (
    <div className="space-y-6">
      {/* Header: judul + deskripsi + aksi publish, pola sama dengan
          AdminManager.jsx (judul kiri, tombol aksi kanan). */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Kuis Sumatif — {era?.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            "Final boss" akhir era — soal tidak dikelola manual di sini, cukup pastikan kuis formatif
            tiap tahun sudah lengkap & published.
          </p>
        </div>
        <Button
          onClick={togglePublish}
          disabled={publishing || (!data.is_published && !data.can_publish)}
          style={{ backgroundColor: accent }}
          className="text-white hover:opacity-90 disabled:opacity-40"
        >
          {publishing ? "Menyimpan…" : data.is_published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info aturan kuis sumatif — dibuat lebih informatif/terlihat (dulu
          1 baris teks kecil abu-abu), sekarang 3 poin kunci dengan ikon
          supaya langsung kebaca tanpa perlu mengecil-kecilkan mata. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoStat
          icon={Shuffle}
          accent={accent}
          label="Sumber soal"
          value="Ditarik otomatis dari kuis formatif tiap tahun"
        />
        <InfoStat
          icon={ListChecks}
          accent={accent}
          label="Jumlah soal"
          value={`${data.attempt_question_count} soal per attempt`}
        />
        <InfoStat icon={Target} accent={accent} label="Passing grade" value="75% (fixed, tidak bisa diubah)" />
      </div>

      {/* Tabel status kuis formatif tiap tahun — dibungkus card senada
          AdminManager.jsx (`rounded-lg border border-l-4`), warna aksen
          kiri mengikuti warna era, bukan warna fix. */}
      <div className="rounded-lg border border-l-4" style={{ borderLeftColor: accent }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tahun</TableHead>
              <TableHead>Kuis Formatif</TableHead>
              <TableHead>Soal</TableHead>
              <TableHead className="text-right">Kuota Sumatif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.years.map((y) => (
              <TableRow key={y.id}>
                <TableCell className="font-medium">
                  {y.year} — {y.title}
                </TableCell>
                <TableCell>
                  {y.quiz_published ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 size={13} /> Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-amber-600">
                      <XCircle size={13} /> Belum
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{y.quiz_question_count}/10</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {y.quota_if_published !== null ? `${y.quota_if_published} soal` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!data.can_publish && (
        <p className="text-xs text-amber-600">
          {readyYearsCount}/{data.years.length} tahun sudah publish kuis formatifnya — kuis sumatif
          baru bisa dipublish begitu SEMUA tahun di era ini sudah publish (masing-masing 10 soal
          lengkap). Kelola soal formatif lewat tab Kuis di halaman tahun terkait.
        </p>
      )}

      {data.can_publish && !data.is_published && (
        <p className="text-xs text-emerald-600">
          Semua tahun sudah siap — kuis sumatif bisa dipublish sekarang.
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Stats */

function InfoStat({ icon: Icon, accent, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
      >
        <Icon size={16} />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <p className="text-sm font-semibold text-zinc-800">{value}</p>
      </div>
    </div>
  );
}