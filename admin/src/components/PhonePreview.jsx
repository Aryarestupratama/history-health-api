import {
  Lock,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Video,
  FileWarning,
  Sparkles,
  Syringe,
  Building2,
  CalendarDays,
  Quote,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PALETTE, ERA_ACCENTS } from "@/config/branding";

/**
 * <PhonePreview screen="roadmap" data={...} />
 *
 * Preview HP live untuk Content Studio (Design.md §4.3). Dipakai di dalam
 * WabahWorkspace, di-refresh dari state form (client-side), bukan menunggu
 * tombol Simpan. Tidak melakukan API call sendiri — semua data dikirim
 * lewat prop `data` oleh parent.
 *
 * Props:
 * - screen: "roadmap" | "section-detail" | "summary" | "quiz" | "vaccine-detail"
 * - data: bentuk berbeda tergantung `screen` — lihat komentar shape di atas
 *   masing-masing screen (SectionDetailScreen sekarang pakai `headerImageUrl`
 *   menggantikan judul, SummaryScreen pakai `summaryImageUrl`/`quoteText`/
 *   `references` menggantikan `summary` teks).
 * - eraSlug: opsional, untuk aksen warna era (kolonial/kemerdekaan/modern)
 * - compact: opsional, perkecil frame HP (dipakai saat preview ada di dalam
 *   modal sempit, mis. dialog preview vaksin — bukan split-screen Content
 *   Studio yang punya ruang lega)
 */
export default function PhonePreview({ screen, data, eraSlug, compact = false }) {
  const accent = ERA_ACCENTS?.[eraSlug]?.hex ?? PALETTE.ink;
  const eraLabel = ERA_ACCENTS?.[eraSlug]?.label ?? null;

  return (
    <div className="sticky top-4 flex flex-col items-center">
      <PhoneFrame compact={compact}>
        <StatusBar />
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden break-words px-4 pb-6 pt-3"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {screen === "roadmap" && <RoadmapScreen data={data} accent={accent} eraLabel={eraLabel} />}
          {screen === "section-detail" && <SectionDetailScreen data={data} accent={accent} eraLabel={eraLabel} />}
          {screen === "summary" && <SummaryScreen data={data} accent={accent} />}
          {screen === "quiz" && <QuizScreen data={data} accent={accent} />}
          {screen === "era-quiz-recap" && <EraQuizRecapScreen data={data} accent={accent} />}
          {screen === "vaccine-detail" && <VaccineDetailScreen data={data} accent={accent} />}
          {!screen && <EmptyState />}
        </div>
      </PhoneFrame>
      <p className="mt-3 text-xs text-zinc-400">Preview live &middot; menyesuaikan saat kamu mengetik</p>
    </div>
  );
}

/* ---------------------------------------------------------- Frame & chrome */

function PhoneFrame({ children, compact }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-900 bg-white shadow-xl ${
        compact ? 'h-[480px] w-[240px]' : 'h-[640px] w-[300px]'
      }`}
    >
      <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
      {children}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pb-1 pt-2 text-[10px] font-medium text-zinc-500">
      <span>9:41</span>
      <span className="tracking-wide">SEKALA</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-300">
      <FileWarning size={28} />
      <p className="text-xs">Belum ada yang diedit</p>
    </div>
  );
}

/* ------------------------------------------------------------- Roadmap tab */
// data: { yearTitle, yearNumber, sections: [{ id, title, order, isPublished, locked }], activeId? }

function RoadmapScreen({ data, accent, eraLabel }) {
  const sections = data?.sections ?? [];
  return (
    <div>
      {eraLabel && (
        <span
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${accent}26`, color: accent }}
        >
          {eraLabel}
        </span>
      )}
      <p className="text-xs font-medium text-zinc-400">{data?.yearNumber ?? "—"}</p>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">{data?.yearTitle || "Judul wabah"}</h2>

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Belum ada section
        </p>
      )}

      <ol className="space-y-2">
        {sections
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s, i) => {
            const isActive = s.id === data?.activeId;
            return (
              <li
                key={s.id ?? i}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  isActive ? "border-transparent text-white shadow-sm" : "border-zinc-100 bg-zinc-50"
                }`}
                style={isActive ? { backgroundColor: accent } : undefined}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive ? "bg-white/25 text-white" : "bg-white text-zinc-500"
                  }`}
                >
                  {s.order ?? i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {s.title || "(belum diberi judul)"}
                  {!s.isPublished && (
                    <span className={`ml-2 text-[10px] font-normal ${isActive ? "text-white/70" : "text-zinc-400"}`}>
                      draft
                    </span>
                  )}
                </span>
                {s.locked ? (
                  <Lock size={16} className={isActive ? "text-white/80" : "text-zinc-300"} />
                ) : (
                  <CheckCircle2 size={16} className={isActive ? "text-white/80" : "text-emerald-400"} />
                )}
              </li>
            );
          })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------- Section detail */
// data: { sectionTitle, headerImageUrl, blocks: [{ id, type: 'text'|'image'|'video'|'pdf', content, resolved_url, caption }] }
//
// (Revisi) `sectionTitle` TIDAK LAGI dirender sebagai judul — posisi paling
// atas sekarang `headerImageUrl` (opsional per section, boleh null). Kalau
// null, section langsung mulai dari blok konten pertama tanpa header apa pun
// (bukan fallback ke judul teks).

function SectionDetailScreen({ data, accent, eraLabel }) {
  const blocks = data?.blocks ?? [];
  const headerImageUrl = data?.headerImageUrl;
  return (
    <div>
      {eraLabel && (
        <span
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${accent}26`, color: accent }}
        >
          {eraLabel}
        </span>
      )}
      {headerImageUrl ? (
        <img
          src={headerImageUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="mb-3 w-full rounded-xl border border-zinc-100 object-cover"
        />
      ) : (
        <p className="mb-3 text-[10px] italic text-zinc-300">
          (Belum ada header gambar — opsional, section langsung mulai dari blok konten pertama)
        </p>
      )}
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Belum ada blok konten
        </p>
      )}
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <BlockPreview key={b.id ?? i} block={b} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function BlockPreview({ block, accent }) {
  // FIX: API (ContentBlockResource) balikin 'resolved_url' (snake_case),
  // sebelumnya kode di sini baca 'resolvedUrl' (camelCase) yang selalu
  // undefined -> gambar/pdf/video tidak pernah ke-render, selalu jatuh ke
  // placeholder walau link sudah valid.
  const resolvedUrl = block.resolved_url;

  switch (block.type) {
    case "text":
      return (
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
          {block.content || <span className="text-zinc-300">Teks kosong</span>}
        </p>
      );
    case "image":
      return resolvedUrl ? (
        <div>
          <img
            src={resolvedUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full rounded-lg border border-zinc-100 object-cover"
          />
          {block.caption && <p className="mt-1 text-[10px] italic text-zinc-400">{block.caption}</p>}
        </div>
      ) : (
        <MediaPlaceholder icon={<ImageIcon size={18} />} label="Link gambar belum valid" accent={accent} />
      );
    case "video":
      // (Revisi) resolved_url untuk type=video sekarang Google Drive EMBED
      // URL (https://drive.google.com/file/d/{id}/preview, lihat
      // LinkParserService::toDriveVideoEmbedUrl()) -- format sama persis
      // dengan PDF di bawah, sama-sama siap di-<iframe>. YouTube dihapus
      // total dari sistem (Rules.md R-CMS-06 revisi) karena embed video
      // orang lain sering gagal ("video is unavailable") saat uploader
      // aslinya tidak mengaktifkan enable-embed, di luar kendali admin.
      return resolvedUrl ? (
        <div>
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-100 bg-black">
            <iframe
              src={resolvedUrl}
              title="Preview video"
              className="h-full w-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {block.caption && <p className="mt-1 text-[10px] italic text-zinc-400">{block.caption}</p>}
        </div>
      ) : (
        <MediaPlaceholder icon={<Video size={18} />} label="Link Google Drive belum valid" accent={accent} />
      );
    case "pdf":
      // FIX: sebelumnya cuma tampilkan label "Dokumen PDF" tanpa pernah
      // benar-benar render isi dokumen. resolved_url untuk type=pdf sudah
      // berupa URL preview siap-embed Google Drive
      // (drive.google.com/file/d/{id}/preview, lihat
      // LinkParserService::toDrivePdfEmbedUrl()) -- di-iframe supaya admin
      // langsung lihat isi PDF-nya, bukan cuma label statis.
      return resolvedUrl ? (
        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
          <iframe src={resolvedUrl} title="Preview PDF" className="h-full w-full" frameBorder="0" />
        </div>
      ) : (
        <MediaPlaceholder icon={<FileText size={18} />} label="Link PDF belum valid" accent={accent} />
      );
    default:
      return null;
  }
}

function MediaPlaceholder({ icon, label, accent }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-400">
      <span style={{ color: accent }}>{icon}</span>
      {label}
    </div>
  );
}

/* ------------------------------------------------------------- Summary tab */
// data: { summaryImageUrl, quoteText, references: string[], vaccines: [{ id, name, photo }], showUnlockAnimation }
//
// (Revisi) Urutan render mengikuti urutan tampil end-user (Design.md §3.3.4):
// Rangkuman (gambar infografis) -> Quote -> Referensi -> Vaksin terkait ->
// tombol Kuis. `summary` (teks) dihapus, diganti `summaryImageUrl` (resolved).

function SummaryScreen({ data, accent }) {
  const vaccines = data?.vaccines ?? [];
  const references = data?.references ?? [];
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-zinc-900">Rangkuman Wabah</h2>

      {data?.summaryImageUrl ? (
        <img
          src={data.summaryImageUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="mb-5 w-full rounded-xl border border-zinc-100 object-cover"
        />
      ) : (
        <p className="mb-5 rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Rangkuman (infografis) belum diisi
        </p>
      )}

      {data?.quoteText && (
        <div className="mb-5 flex gap-2 rounded-xl bg-zinc-50 p-3">
          <Quote size={16} className="mt-0.5 shrink-0" style={{ color: accent }} />
          <p className="text-sm italic leading-relaxed text-zinc-600">{data.quoteText}</p>
        </div>
      )}

      {references.length > 0 && (
        <div className="mb-5">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <BookOpen size={12} /> Referensi
          </p>
          <ol className="space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-500">
            {references.map((ref, i) => (
              <li key={i} className="list-decimal">
                {ref}
              </li>
            ))}
          </ol>
        </div>
      )}

      {data?.showUnlockAnimation && vaccines.length > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl p-3 text-white shadow-sm"
          style={{ backgroundColor: PALETTE.purple }}
        >
          <Sparkles size={18} />
          <span className="text-sm font-medium">Vaksin baru terbuka!</span>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Vaksin terkait</p>
      {vaccines.length === 0 && <p className="text-xs text-zinc-300">Belum ada vaksin di-assign</p>}
      <div className="grid grid-cols-3 gap-2">
        {vaccines.map((v, i) => (
          <div key={v.id ?? i} className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-zinc-100 bg-zinc-50">
              {v.photo ? (
                <img src={v.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-zinc-300">?</span>
              )}
            </div>
            <span className="line-clamp-2 text-center text-[10px] text-zinc-500">{v.name || "Vaksin"}</span>
          </div>
        ))}
      </div>

      <button
        className="mt-6 w-full rounded-lg py-2.5 text-sm font-medium text-white"
        style={{ backgroundColor: accent }}
      >
        Kerjakan Kuis
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- Quiz tab */
// data: { questions: [{ id, question, explanation_correct, explanation_incorrect,
//         options: [{ option_text, is_correct }] }], activeIndex, footerNote? }
//
// R-QUIZ-04 (revisi terbaru — feedback dipecah 2 kolom): preview kini
// menampilkan 1 soal per halaman (bukan lagi semua soal sekaligus dalam 1
// layar scrollable) — mengikuti `activeIndex` yang dikontrol dari tombol
// selector soal (1/2/3/...) di editor admin (WabahWorkspace::QuizTab), jadi
// preview otomatis "ganti halaman" begitu admin pindah soal di editor.
// Ditambah toggle simulasi "Benar"/"Salah" supaya admin bisa lihat kedua
// versi tampilan feedback (explanation_correct vs explanation_incorrect)
// tanpa perlu login sebagai user beneran — toggle ini murni alat bantu
// preview, bukan bagian dari tampilan end-user asli.
//
// DIREUSE untuk preview kuis sumatif era (EraQuizManager) — bentuk data
// per-soal identik (question/options/explanation_correct/explanation_incorrect),
// cuma beda perilaku end-user asli (submit di akhir + halaman skor, bukan
// feedback instan tanpa skor). `footerNote` dipakai EraQuizManager untuk
// menimpa teks catatan bawah supaya tidak menyesatkan ("tanpa tampilan skor"
// tidak berlaku untuk kuis sumatif era).

function QuizScreen({ data, accent }) {
  const questions = data?.questions ?? [];
  const activeIndex = data?.activeIndex ?? 0;
  const question = questions[activeIndex];

  // null = "belum dijawab" (state default, sama seperti tampilan user
  // sebelum tap opsi apa pun — tidak ada highlight/kunci jawaban bocor,
  // selaras R-QUIZ-04).
  const [feedbackMode, setFeedbackMode] = useState(null);

  // Reset ke "belum dijawab" tiap kali admin pindah soal di editor, supaya
  // simulasi lama tidak nyangkut ke soal lain yang belum tentu relevan.
  useEffect(() => {
    setFeedbackMode(null);
  }, [activeIndex]);

  if (questions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
        Belum ada soal
      </p>
    );
  }

  if (!question) {
    // activeIndex di luar jangkauan (mis. soal baru saja dihapus admin).
    return null;
  }

  const options = question.options ?? [];
  const correctOption = options.find((o) => o.is_correct);
  // Simulasi opsi yang "dipilih user" sesuai mode toggle yang aktif.
  const simulatedSelected =
    feedbackMode === "correct"
      ? correctOption
      : feedbackMode === "incorrect"
      ? options.find((o) => !o.is_correct) ?? null
      : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400">
          Soal {activeIndex + 1} dari {questions.length}
        </p>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: i === activeIndex ? accent : "#E4E4E7" }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl p-3">
        <p className="mb-3 text-sm font-medium leading-relaxed text-zinc-900">
          {question.question || <span className="text-zinc-300">Teks soal kosong</span>}
        </p>

        <div className="space-y-2">
          {options.length === 0 && (
            <p className="text-xs text-zinc-300">Belum ada opsi jawaban</p>
          )}
          {options.map((opt, oi) => {
            const isCorrectOpt = !!opt.is_correct;
            const isSimulatedSelected = simulatedSelected === opt;
            // R-QUIZ-04: opsi benar tetap di-highlight begitu sudah "dijawab"
            // (mode manapun), termasuk saat simulasi salah — user tetap
            // lihat mana opsi yang benar di antara pilihan.
            const showAsCorrect = feedbackMode !== null && isCorrectOpt;
            const showAsWrongSelected = feedbackMode === "incorrect" && isSimulatedSelected && !isCorrectOpt;

            return (
              <div
                key={oi}
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                  showAsCorrect
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : showAsWrongSelected
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-zinc-100 text-zinc-700"
                }`}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: showAsCorrect ? "#4BA95F" : showAsWrongSelected ? "#DC5B5B" : accent,
                  }}
                />
                <span className="flex-1">
                  {opt.option_text || <span className="text-zinc-300">Opsi kosong</span>}
                </span>
                {showAsCorrect && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                    Benar
                  </span>
                )}
                {showAsWrongSelected && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
                    Dipilih user
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {feedbackMode !== null && (
          <div
            className={`mt-3 rounded-lg p-3 text-xs leading-relaxed ${
              feedbackMode === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide">
              {feedbackMode === "correct" ? "Benar! 🎉" : "Kurang tepat"}
            </p>
            <p>
              {feedbackMode === "correct" ? (
                question.explanation_correct || <span className="italic text-zinc-300">Belum diisi</span>
              ) : (
                question.explanation_incorrect || <span className="italic text-zinc-300">Belum diisi</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Toggle simulasi preview — BUKAN kontrol yang muncul di tampilan
          end-user asli, murni alat bantu admin lihat 3 kondisi (belum
          dijawab/benar/salah) tanpa perlu 2 device atau login sebagai user
          beneran. */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setFeedbackMode(null)}
          className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
            feedbackMode === null ? "text-white" : "bg-zinc-100 text-zinc-500"
          }`}
          style={feedbackMode === null ? { backgroundColor: accent } : undefined}
        >
          Belum dijawab
        </button>
        <button
          onClick={() => setFeedbackMode("correct")}
          className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
            feedbackMode === "correct" ? "text-white" : "bg-zinc-100 text-zinc-500"
          }`}
          style={feedbackMode === "correct" ? { backgroundColor: "#4BA95F" } : undefined}
        >
          Simulasi: Benar
        </button>
        <button
          onClick={() => setFeedbackMode("incorrect")}
          className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
            feedbackMode === "incorrect" ? "text-white" : "bg-zinc-100 text-zinc-500"
          }`}
          style={feedbackMode === "incorrect" ? { backgroundColor: "#DC5B5B" } : undefined}
        >
          Simulasi: Salah
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-zinc-300">
        {data?.footerNote ?? "Ganti soal dari editor di sebelah kiri · tanpa tampilan skor"}
      </p>
    </div>
  );
}

/* ---------------------------------------------------- Era quiz recap tab */
// data: { eraLabel, score: { correct, total, percentage },
//         questions: [{ question, options: [{ id, option_text }],
//         selected_option_id, correct_option_id, is_correct, explanation }] }
//
// Preview halaman "Lihat Rekapan" kuis sumatif era — BEDA dari QuizScreen
// (1 soal per halaman): di sini SEMUA soal ditampilkan sekaligus dalam 1
// layar scroll, masing-masing sudah dalam kondisi "sudah dijawab" (opsi
// benar hijau, opsi user yang salah merah, explanation tampil langsung
// tanpa toggle simulasi — datanya sudah final dari attempt yang tersimpan).

function EraQuizRecapScreen({ data, accent }) {
  const questions = data?.questions ?? [];
  const score = data?.score;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-400">Rekap Kuis Sumatif</p>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900">{data?.eraLabel || "Era"}</h2>
      {score && (
        <p className="mb-4 text-xs text-zinc-500">
          Benar {score.correct} dari {score.total} soal ({score.percentage}%)
        </p>
      )}

      {questions.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Belum ada soal / belum ada attempt
        </p>
      )}

      <div className="space-y-4">
        {questions.map((item, qi) => (
          <div key={qi} className="rounded-xl border border-zinc-100 p-3">
            <p className="mb-2 text-sm font-medium leading-relaxed text-zinc-900">
              {qi + 1}. {item.question || <span className="text-zinc-300">Teks soal kosong</span>}
            </p>
            <div className="space-y-2">
              {(item.options ?? []).map((opt) => {
                const isCorrectOpt = opt.id === item.correct_option_id;
                const isUserWrongPick = opt.id === item.selected_option_id && !item.is_correct;

                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                      isCorrectOpt
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : isUserWrongPick
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-zinc-100 text-zinc-700"
                    }`}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: isCorrectOpt ? "#4BA95F" : isUserWrongPick ? "#DC5B5B" : accent,
                      }}
                    />
                    <span className="flex-1">{opt.option_text}</span>
                  </div>
                );
              })}
            </div>
            <div
              className={`mt-2 rounded-lg p-2.5 text-xs leading-relaxed ${
                item.is_correct ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {item.explanation || <span className="italic text-zinc-300">Belum diisi</span>}
            </div>
          </div>
        ))}
      </div>

      <button
        className="mt-6 w-full rounded-lg py-2.5 text-sm font-medium text-white"
        style={{ backgroundColor: accent }}
      >
        Kembali ke Hasil
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ Vaccine tab */
// data: { name, photo (raw drive link, dipakai fallback), resolvedPhotoUrl,
//         manufacturer, diseaseTarget, yearIntroduced, description, locked }
//
// `locked` (default false) mensimulasikan tampilan siluet/placeholder saat
// vaksin belum di-unlock user (Design.md §3.4, R-VAC-04) — berguna buat
// admin cek dua kondisi tampilan (terkunci vs terbuka) dari 1 form yang sama,
// tanpa perlu 2 layar preview terpisah.

function VaccineDetailScreen({ data, accent }) {
  const {
    name,
    resolvedPhotoUrl,
    resolvedPhotoLockedUrl,
    manufacturer,
    diseaseTarget,
    yearIntroduced,
    description,
    locked = false,
  } = data ?? {};

  return (
    <div>
      <span
        className="mb-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: `${PALETTE.purple}26`, color: PALETTE.purple }}
      >
        Koleksi Vaksin
      </span>

      <div className="mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
        {locked ? (
          resolvedPhotoLockedUrl ? (
            <img
              src={resolvedPhotoLockedUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-300">
              <Lock size={32} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Belum terbuka</span>
              <span className="text-[9px]">(link foto siluet belum diisi)</span>
            </div>
          )
        ) : resolvedPhotoUrl ? (
          <img
            src={resolvedPhotoUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-300">
            <Syringe size={32} />
            <span className="text-[10px]">Link foto belum valid</span>
          </div>
        )}
      </div>

      <h2 className="mb-1 text-base font-semibold text-zinc-900">
        {locked ? "???" : name || "Nama vaksin"}
      </h2>

      {locked ? (
        <p className="mb-4 text-xs text-zinc-400">
          Selesaikan seluruh section &amp; kuis wabah terkait untuk membuka detail vaksin ini.
        </p>
      ) : (
        <>
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Building2 size={14} style={{ color: accent }} />
              <span>{manufacturer || <span className="text-zinc-300">Produsen belum diisi</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Syringe size={14} style={{ color: accent }} />
              <span>{diseaseTarget || <span className="text-zinc-300">Penyakit target belum diisi</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CalendarDays size={14} style={{ color: accent }} />
              <span>{yearIntroduced || <span className="text-zinc-300">Tahun belum diisi</span>}</span>
            </div>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Deskripsi</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
            {description || <span className="text-zinc-300">Deskripsi belum diisi</span>}
          </p>
        </>
      )}
    </div>
  );
}