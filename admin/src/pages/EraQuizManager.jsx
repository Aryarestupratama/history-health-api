import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import apiClient from "@/api";
import { Button } from "@/components/ui/button";
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
 */
export default function EraQuizManager({ era }) {
  const [data, setData] = useState(null); // { is_published, can_publish, attempt_question_count, years: [...] }
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const accent = ERA_ACCENTS?.[era?.slug]?.hex;

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
      load(); // refresh breakdown per year (quota berubah begitu status publish berubah)
    } catch (e) {
      setError(
        e?.response?.data?.message ??
          "Gagal publish (butuh SEMUA tahun di era ini sudah punya kuis formatif 10 soal yang dipublish)."
      );
    } finally {
      setPublishing(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-zinc-400">Memuat status kuis sumatif…</p>;
  }

  const readyYearsCount = data.years.filter((y) => y.quiz_published).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Kuis Sumatif — {era?.name}
          </p>
          <p className="text-[11px] text-zinc-400">
            Soal ditarik otomatis dari kuis formatif tiap tahun · {data.attempt_question_count} soal
            per attempt · passing grade 75%
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={togglePublish} disabled={publishing}>
          {publishing ? "Menyimpan…" : data.is_published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="rounded-lg border border-zinc-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400">
              <th className="px-3 py-2">Tahun</th>
              <th className="px-3 py-2">Kuis Formatif</th>
              <th className="px-3 py-2">Soal</th>
              <th className="px-3 py-2">Kuota sumatif</th>
            </tr>
          </thead>
          <tbody>
            {data.years.map((y) => (
              <tr key={y.id} className="border-b border-zinc-50 last:border-0">
                <td className="px-3 py-2 font-medium text-zinc-900">
                  {y.year} — {y.title}
                </td>
                <td className="px-3 py-2">
                  {y.quiz_published ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={14} /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <XCircle size={14} /> Belum
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-500">{y.quiz_question_count}/10</td>
                <td className="px-3 py-2 text-zinc-500">
                  {y.quota_if_published !== null ? `${y.quota_if_published} soal` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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